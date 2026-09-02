pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const htmlUpload = document.getElementById('html-upload');
const pdfUpload = document.getElementById('pdf-upload');
const htmlFilename = document.getElementById('html-filename');
const pdfFilename = document.getElementById('pdf-filename');
const btnCrosscheck = document.getElementById('btn-crosscheck');
const processingState = document.getElementById('processing-state');
const resultsContainer = document.getElementById('results-container');
const tableBody = document.getElementById('results-table-body');
const statusBadge = document.getElementById('status-badge');

const appState = {
  htmlData: null,
  pdfData: null,
  extractedHTML: {},
  extractedPDF: {}
};

htmlUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.html')) {
    alert('Please upload a valid HTML file.');
    htmlUpload.value = '';
    return;
  }

  htmlFilename.textContent = file.name;
  const reader = new FileReader();
  reader.onload = (event) => {
    appState.htmlData = event.target.result;
    updateCheckerAvailability();
  };
  reader.readAsText(file);
});

pdfUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.pdf')) {
    alert('Please upload a valid PDF file.');
    pdfUpload.value = '';
    return;
  }

  pdfFilename.textContent = file.name;
  const reader = new FileReader();
  reader.onload = (event) => {
    appState.pdfData = event.target.result;
    updateCheckerAvailability();
  };
  reader.readAsArrayBuffer(file);
});

function updateCheckerAvailability() {
  btnCrosscheck.classList.toggle('hidden', !(appState.htmlData && appState.pdfData));
}

btnCrosscheck.addEventListener('click', async () => {
  if (!(appState.htmlData && appState.pdfData)) {
    alert('Please upload both an HTML file and a PDF file before running the crosschecker.');
    return;
  }

  btnCrosscheck.classList.add('hidden');
  processingState.classList.remove('hidden');
  resultsContainer.classList.add('hidden');

  try {
    appState.extractedHTML = parseHTMLForChecker(appState.htmlData);
    appState.extractedPDF = await parsePDF(appState.pdfData);
    renderResults(appState.extractedHTML, appState.extractedPDF);
  } catch (err) {
    console.error('Error during crosscheck:', err);
    alert('An error occurred during parsing. Check console for details.');
  } finally {
    processingState.classList.add('hidden');
    btnCrosscheck.classList.remove('hidden');
    btnCrosscheck.innerHTML = 'Run Again';
  }
});

function parseHTMLForChecker(htmlString) {
  const data = parseDetailedHTML(htmlString);
  return {
    'JOB NAME': data['JOB NAME'],
    'JOB #': data['JOB #'],
    PHONE: data.PHONE,
    CONTRACTOR: data.CONTRACTOR,
    'CONTACT/EXPEDITER': data['CONTACT/EXPEDITER'],
    MATERIAL: data.MATERIAL,
    'EDGE PROFILE': data['EDGE PROFILE'],
    SINK: data.SINK,
    'FAUCET DRILLINGS': data['FAUCET DRILLINGS'],
    'TEAR-OUT': data['TEAR-OUT']
  };
}

function parseDetailedHTML(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const data = {};

  const findValueByLabel = (labelText) => {
    const labels = Array.from(doc.querySelectorAll('td, div'));
    for (const el of labels) {
      if (el.textContent.trim() === labelText && el.nextElementSibling) {
        return el.nextElementSibling.textContent.trim();
      }
    }
    return '';
  };

  data['JOB NAME'] = findValueByLabel('Job Name:') || '';
  data['JOB #'] = findValueByLabel('Job #:') || '';

  const jobAddressLabel = Array.from(doc.querySelectorAll('td')).find(td => td.textContent.trim() === 'Job Address');
  if (jobAddressLabel) {
    const tr = jobAddressLabel.closest('tr');
    const addressCell = tr && tr.nextElementSibling ? tr.nextElementSibling.querySelector('.pageInfoValue') : null;
    if (addressCell) {
      const lines = addressCell.innerHTML.split(/<br\s*\/?>/i)
        .map(s => s.replace(/<[^>]*>?/gm, '').trim())
        .filter(s => s.length > 0);

      let addrIdx = 0;
      if (lines[0] && data['JOB NAME'] && lines[0].toLowerCase().includes(data['JOB NAME'].split(',')[0].toLowerCase())) {
        addrIdx = 1;
      }

      data.ADDRESS_LINE1 = lines[addrIdx] || '';
      data.ADDRESS_LINE2 = lines[addrIdx + 1] || '';
      if (lines[addrIdx + 2] && !lines[addrIdx + 2].match(/\d{3}-\d{3}-\d{4}/)) {
        data.ADDRESS_LINE3 = lines[addrIdx + 2];
      }

      const phoneMatch = addressCell.textContent.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) data.PHONE = phoneMatch[0];
    }
  }

  const accountAddressLabel = Array.from(doc.querySelectorAll('td')).find(td => td.textContent.trim() === 'Account Address');
  if (accountAddressLabel) {
    const tr = accountAddressLabel.closest('tr')?.nextElementSibling;
    if (tr) {
      const txt = tr.textContent;
      const lockMatch = txt.match(/lock\s*box.*?:?\s*([a-z0-9]+)/i) || txt.match(/code.*?:?\s*([a-z0-9]+)/i);
      if (lockMatch) data['LOCK BOX'] = lockMatch[0].trim();
    }
  }

  if (!data['LOCK BOX']) {
    const genLockMatch = doc.body.textContent.match(/lock\s*box.*?:?\s*([a-z0-9]+)/i) || doc.body.textContent.match(/code.*?:?\s*([a-z0-9]+)/i);
    if (genLockMatch) data['LOCK BOX'] = genLockMatch[0].trim();
  }

  const contactTable = doc.getElementById('ContactsBody');
  if (contactTable) {
    const rows = contactTable.querySelectorAll('tr');
    if (rows.length > 0) {
      const firstRowCells = rows[0].querySelectorAll('td');
      if (firstRowCells.length >= 2) {
        data['CONTACT/EXPEDITER'] = firstRowCells[0].textContent.trim();
        const cphoneMatch = firstRowCells[1].textContent.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (cphoneMatch) data.CONTACT_PHONE = cphoneMatch[0];
      }
    }
  }

  const accLink = doc.querySelector('a[href*="/sys/account/"]');
  if (accLink) {
    data.CONTRACTOR = accLink.textContent.trim().replace(/✅/g, '').trim();
  }

  const product = findValueByLabel('●Product:');
  const color = findValueByLabel('Other Color (not in dropdown):') || findValueByLabel('●Color:');
  const thickness = findValueByLabel('●Thickness:');
  const materialParts = [];
  if (thickness) materialParts.push(thickness);
  if (product) materialParts.push(product);
  if (color && color.toLowerCase() !== 'other (see notes)') materialParts.push(color);
  data.MATERIAL = materialParts.join(' ').trim();

  data['EDGE PROFILE'] = findValueByLabel('●Edge Profile:') || '';

  const sinkModel = findValueByLabel('●Sink Model #:') || 'TBD';
  const sinkMount = findValueByLabel('●Sink Type:') || 'TBD';
  const sinkSupplied = findValueByLabel('●Sink Supplied By:') || 'TBD';
  const sinkLoc = findValueByLabel('Sink Location:');
  data.SINK = `TBD / ${sinkModel} / TBD / ${sinkMount}`;

  const locStr = [];
  if (sinkLoc) locStr.push(sinkLoc);
  if (sinkSupplied !== 'TBD') locStr.push(`(SUPPLIED BY ${sinkSupplied})`);
  data['SINK LOCATION'] = locStr.join(' ').trim();

  const faucetHoles = findValueByLabel('●# Holes/Spread:') || 'TBD';
  const faucetModel = findValueByLabel('●Faucet Model #:') || 'TBD';
  const faucetNotes = findValueByLabel('Faucet Notes:') || 'NONE';
  data['FAUCET DRILLINGS'] = `${faucetHoles} / ${faucetModel} / ${faucetNotes}`;

  const splashType = findValueByLabel('●Splash Info:');
  const splashHeight = findValueByLabel('●Backsplash Height (in):');
  const sideSplash = findValueByLabel('Side Splash:');
  const splashStr = [];
  if (splashType && splashType.toLowerCase() !== 'none') splashStr.push(splashType);
  if (splashHeight) splashStr.push(`Back: ${splashHeight}"`);
  if (sideSplash) splashStr.push(`Side: ${sideSplash}"`);
  data.SPLASH = splashStr.length > 0 ? splashStr.join(' | ') : 'NONE';

  data.CABINETS = findValueByLabel('●Cabinets:') || '';
  data['TEAR-OUT'] = findValueByLabel('●Tearout:') || 'NONE';

  const rangeType = findValueByLabel('●Range/Cooktop Type:');
  const rangeModel = findValueByLabel('Range/Cooktop Model:');
  const rangeStr = [];
  if (rangeType && rangeType.toLowerCase() !== 'n/a') rangeStr.push(rangeType);
  if (rangeModel) rangeStr.push(rangeModel);
  data['RANGE / COOKTOP'] = rangeStr.length > 0 ? rangeStr.join(' / ') : 'NONE';

  for (const key in data) {
    if (data[key]) data[key] = data[key].toUpperCase().replace(/\s+/g, ' ').trim();
  }

  return data;
}

async function parsePDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + ' ';
  }

  fullText = fullText.toUpperCase().replace(/\s+/g, ' ');

  const data = {};
  const extract = (prefix, suffixes) => {
    const suffixPattern = suffixes.join('|');
    const regex = new RegExp(`${prefix}\s*(.*?)\s*(?:${suffixPattern}|$)`, 'i');
    const match = fullText.match(regex);
    return match ? match[1].trim() : 'NOT FOUND';
  };

  data['JOB NAME'] = extract('JOB NAME:', ['PHONE:', 'COUNTERTOP:', 'ADDRESS', 'JOB#']);
  data['JOB #'] = extract('JOB#', ['CONTRACTOR', 'CONTACT', 'SINK:']);
  data.PHONE = extract('PHONE:', ['COUNTERTOP:', 'LOCK BOX', 'SINK:']);
  data.CONTRACTOR = extract('CONTRACTOR', ['CONTACT/EXPEDITER:', 'PHONE:']);
  data['CONTACT/EXPEDITER'] = extract('CONTACT/EXPEDITER:', ['PHONE:', 'LOCK BOX']);

  const matMatch = fullText.match(/(?:2CM|3CM)\s*-\s*(.*?)TEAR-OUT/i);
  data.MATERIAL = matMatch ? matMatch[1].trim() : 'NOT FOUND';

  data['EDGE PROFILE'] = extract('PROFILE:', ['TEMPLATED', 'JOB#', 'CONTRACTOR']);
  data['TEAR-OUT'] = extract('TEAR-OUT \\(', ['\\)', 'PAGE']);
  if (data['TEAR-OUT'] !== 'NOT FOUND') data['TEAR-OUT'] = `TEAR-OUT (${data['TEAR-OUT']})`;

  data.SINK = extract('SINK: MAKE/MODEL/COLOR:', ['TOP MOUNT', 'SINK LOCATION', 'FAUCET']);
  data['FAUCET DRILLINGS'] = extract('FAUCET DRILLINGS:', ['BACKSPLASH', 'SIDESPLASH', 'RANGE']);

  return data;
}

function renderResults(htmlData, pdfData) {
  resultsContainer.classList.remove('hidden');
  tableBody.innerHTML = '';
  let discrepancies = 0;

  const fieldsToCompare = [
    'JOB NAME', 'JOB #', 'PHONE', 'CONTRACTOR', 'CONTACT/EXPEDITER',
    'MATERIAL', 'EDGE PROFILE', 'SINK', 'FAUCET DRILLINGS', 'TEAR-OUT'
  ];

  fieldsToCompare.forEach(field => {
    const htmlVal = htmlData[field] || 'NOT FOUND';
    const pdfVal = pdfData[field] || 'NOT FOUND';

    const cleanHTML = htmlVal.replace(/[^\w\d]/g, '');
    const cleanPDF = pdfVal.replace(/[^\w\d]/g, '');

    let isMatch = false;
    if (cleanHTML === cleanPDF) {
      isMatch = true;
    } else if ((cleanHTML.includes(cleanPDF) || cleanPDF.includes(cleanHTML)) && cleanHTML.length > 2 && cleanPDF.length > 2) {
      isMatch = true;
    }

    if (!isMatch) discrepancies++;

    const row = document.createElement('tr');
    const statusClass = isMatch ? 'match' : 'discrepancy';
    const statusText = isMatch ? 'Match' : 'Discrepancy';

    row.innerHTML = `
      <td>${field}</td>
      <td>${htmlVal}</td>
      <td>${pdfVal}</td>
      <td><span class="status-pill ${statusClass}"><i class="fa-solid ${isMatch ? 'fa-check' : 'fa-xmark'}"></i> ${statusText}</span></td>
    `;

    tableBody.appendChild(row);
  });

  if (discrepancies === 0) {
    statusBadge.className = 'status-pill match';
    statusBadge.innerHTML = '<i class="fa-solid fa-shield-check"></i> Perfect Match';
  } else {
    statusBadge.className = 'status-pill discrepancy';
    statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${discrepancies} Discrepanc${discrepancies > 1 ? 'ies' : 'y'} Found`;
  }
}
