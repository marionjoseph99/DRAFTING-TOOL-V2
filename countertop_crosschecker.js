pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const htmlUpload = document.getElementById('html-upload');
const htmlFilename = document.getElementById('html-filename');
const btnFetch = document.getElementById('btn-fetch');
const btnResetFetcher = document.getElementById('btn-reset-fetcher');
const fetcherResults = document.getElementById('fetcher-results');
const extractedTextArea = document.getElementById('extracted-text-area');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const fetcherStatus = document.getElementById('fetcher-status');
const fetcherSummary = document.getElementById('fetcher-summary');
const fetcherFieldSummary = document.getElementById('fetcher-field-summary');
const fetcherUploadBox = document.getElementById('fetcher-upload-box');
const extractedFieldList = document.getElementById('extracted-field-list');

const checkerHtmlUpload = document.getElementById('checker-html-upload');
const checkerHtmlFilename = document.getElementById('checker-html-filename');
const pdfUpload = document.getElementById('pdf-upload');
const pdfFilename = document.getElementById('pdf-filename');
const btnCrosscheck = document.getElementById('btn-crosscheck');
const btnResetChecker = document.getElementById('btn-reset-checker');
const processingState = document.getElementById('processing-state');
const resultsContainer = document.getElementById('results-container');
const tableBody = document.getElementById('results-table-body');
const statusBadge = document.getElementById('status-badge');
const checkerStatus = document.getElementById('checker-status');
const checkerSummary = document.getElementById('checker-summary');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

const REQUIRED_FIELDS = [
  'JOB NAME',
  'JOB #',
  'ADDRESS_LINE1',
  'ADDRESS_LINE2',
  'PHONE',
  'CONTRACTOR',
  'CONTACT/EXPEDITER',
  'MATERIAL',
  'EDGE PROFILE',
  'SINK',
  'FAUCET DRILLINGS',
  'TEAR-OUT'
];

const appState = {
  fetcherHtmlData: null,
  checkerHtmlData: null,
  pdfData: null
};

const demoHTML = `
<html><body>
<table>
  <tr><td>Job Name:</td><td>Smith Residence</td></tr>
  <tr><td>Job #:</td><td>24680</td></tr>
  <tr><td>Job Address</td><td></td></tr>
  <tr><td></td><td>1234 Maple Ave<br>Greensboro, NC 27401</td></tr>
  <tr><td>Account Address</td><td></td></tr>
  <tr><td></td><td>LOCK BOX: 4567</td></tr>
  <tr><td>●Product:</td><td>QUARTZ</td></tr>
  <tr><td>●Thickness:</td><td>3CM</td></tr>
  <tr><td>●Color:</td><td>WHITE</td></tr>
  <tr><td>●Edge Profile:</td><td>OGEE</td></tr>
  <tr><td>●Sink Model #:</td><td>SK-900</td></tr>
  <tr><td>●Sink Type:</td><td>TOP MOUNT</td></tr>
  <tr><td>Sink Location:</td><td>LEFT</td></tr>
  <tr><td>●# Holes/Spread:</td><td>4 / 8</td></tr>
  <tr><td>●Faucet Model #:</td><td>FA-12</td></tr>
  <tr><td>●Tearout:</td><td>YES</td></tr>
  <tr><td>●Cabinets:</td><td>MAPLE</td></tr>
</table>
</body></html>`;

function setStatus(el, message, type = 'neutral') {
  el.textContent = message;
  el.className = `status-pill ${type}`;
}

function renderExtractedFieldButtons(data) {
  const fieldOrder = [
    { key: 'JOB NAME', label: 'Job Name' },
    { key: 'JOB #', label: 'Job #' },
    { key: 'ADDRESS_LINE1', label: 'Address Line 1' },
    { key: 'ADDRESS_LINE2', label: 'Address Line 2' },
    { key: 'PHONE', label: 'Phone' },
    { key: 'CONTRACTOR', label: 'Contractor' },
    { key: 'CONTACT/EXPEDITER', label: 'Contact / Expediter' },
    { key: 'MATERIAL', label: 'Material' },
    { key: 'EDGE PROFILE', label: 'Edge Profile' },
    { key: 'SINK', label: 'Sink' },
    { key: 'SINK LOCATION', label: 'Sink Location' },
    { key: 'FAUCET DRILLINGS', label: 'Faucet Drillings' },
    { key: 'SPLASH', label: 'Backsplash / Sidesplash' },
    { key: 'CABINETS', label: 'Cabinets' },
    { key: 'TEAR-OUT', label: 'Tear-Out' },
    { key: 'RANGE / COOKTOP', label: 'Range / Cooktop' }
  ];

  extractedFieldList.innerHTML = '';

  fieldOrder.forEach(({ key, label }) => {
    const value = (data[key] || '').trim();
    if (!value) return;

    const item = document.createElement('div');
    item.className = 'field-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'detail-copy-btn';
    button.dataset.copy = value;
    button.innerHTML = `<span>${label}</span><strong>${value}</strong>`;

    button.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else {
          const temp = document.createElement('textarea');
          temp.value = value;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }

        const previous = button.innerHTML;
        button.innerHTML = '<span>Copied</span><strong>Value copied</strong>';
        setTimeout(() => {
          button.innerHTML = previous;
        }, 1200);
      } catch (error) {
        console.error('Copy failed:', error);
        alert('Copy failed. Please try again.');
      }
    });

    item.appendChild(button);
    extractedFieldList.appendChild(item);
  });

  if (!extractedFieldList.innerHTML.trim()) {
    extractedFieldList.innerHTML = '<div class="summary-box" style="grid-column: 1 / -1;">No extracted values available.</div>';
  }
}

function updateFetcherSummary(data) {
  const fieldsPresent = REQUIRED_FIELDS.filter(field => {
    const value = data[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });

  const missingFields = REQUIRED_FIELDS.filter(field => !fieldsPresent.includes(field));
  const foundCount = fieldsPresent.length;
  const totalCount = REQUIRED_FIELDS.length;

  if (foundCount === totalCount) {
    setStatus(fetcherStatus, 'Extraction complete', 'success');
    fetcherSummary.textContent = `All ${totalCount} core fields were found.`;
  } else if (foundCount >= totalCount * 0.6) {
    setStatus(fetcherStatus, 'Partial extraction', 'warning');
    fetcherSummary.textContent = `Found ${foundCount}/${totalCount} fields. Review: ${missingFields.join(', ')}`;
  } else {
    setStatus(fetcherStatus, 'Needs review', 'error');
    fetcherSummary.textContent = `Only ${foundCount}/${totalCount} fields were found. Review: ${missingFields.join(', ')}`;
  }

  fetcherFieldSummary.textContent = `${foundCount}/${totalCount} fields extracted`;
}

function updateCheckerAvailability() {
  btnCrosscheck.classList.toggle('hidden', !(appState.checkerHtmlData && appState.pdfData));
}

function setUploadState(el, isActive) {
  el.classList.toggle('drag-over', isActive);
}

['dragenter', 'dragover'].forEach(eventName => {
  fetcherUploadBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    setUploadState(fetcherUploadBox, true);
  });
});

['dragleave', 'drop'].forEach(eventName => {
  fetcherUploadBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    setUploadState(fetcherUploadBox, false);
  });
});

fetcherUploadBox.addEventListener('drop', (event) => {
  const file = event.dataTransfer.files[0];
  if (file) handleFetcherFile(file);
});

function handleFetcherFile(file) {
  if (!file) return;

  if (!file.name.endsWith('.html')) {
    alert('Please upload a valid HTML file.');
    htmlUpload.value = '';
    return;
  }

  htmlFilename.textContent = file.name;
  setStatus(fetcherStatus, 'Loading file...', 'neutral');

  const reader = new FileReader();
  reader.onload = (event) => {
    appState.fetcherHtmlData = event.target.result;
    btnFetch.classList.remove('hidden');
    fetcherSummary.textContent = 'HTML loaded. Ready to extract details.';
    setStatus(fetcherStatus, 'File ready', 'success');
  };
  reader.readAsText(file);
}

htmlUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  handleFetcherFile(file);
});

btnFetch.addEventListener('click', () => {
  if (!appState.fetcherHtmlData) return;

  setStatus(fetcherStatus, 'Extracting details...', 'neutral');
  btnFetch.disabled = true;
  btnFetch.textContent = 'Extracting...';

  setTimeout(() => {
    const parsedData = parseDetailedHTML(appState.fetcherHtmlData);
    const dateOptions = { timeZone: 'America/New_York', month: 'numeric', day: 'numeric', year: 'numeric' };
    const usDateStr = new Intl.DateTimeFormat('en-US', dateOptions).format(new Date());
    const templateStr = `${usDateStr} [INITIALS], ${usDateStr} [INITIALS]`;

    const outputText = `JOB NAME: ${parsedData['JOB NAME'] || ''}
ADDRESS:
LINE 1: ${parsedData.ADDRESS_LINE1 || ''}
LINE 2: ${parsedData.ADDRESS_LINE2 || ''}
${parsedData.ADDRESS_LINE3 ? `LINE 3: ${parsedData.ADDRESS_LINE3}\n` : ''}PHONE: ${parsedData.PHONE || ''}
JOB #: ${parsedData['JOB #'] || ''}
TEMPLATED & DRAWN BY - DATE: ${templateStr}
CONTRACTOR: ${parsedData.CONTRACTOR || ''}
CONTACT/EXPEDITER: ${parsedData['CONTACT/EXPEDITER'] || ''}
PHONE: ${parsedData.CONTACT_PHONE || ''}
LOCK BOX OR KEY: ${parsedData['LOCK BOX'] || 'NONE FOUND'}
MATERIAL: ${parsedData.MATERIAL || ''}
EDGE PROFILE: ${parsedData['EDGE PROFILE'] || ''}
SINK: ${parsedData.SINK || ''}
SINK LOCATION (SUPPLIED BY): ${parsedData['SINK LOCATION'] || ''}
FAUCET DRILLINGS: ${parsedData['FAUCET DRILLINGS'] || ''}
BACKSPLASH / SIDESPLASH: ${parsedData.SPLASH || ''}
CABINETS: ${parsedData.CABINETS || ''}
TEAR-OUT: ${parsedData['TEAR-OUT'] || 'NONE'}
RANGE / COOKTOP: ${parsedData['RANGE / COOKTOP'] || 'NONE'}`;

    extractedTextArea.value = outputText.toUpperCase();
    renderExtractedFieldButtons(parsedData);
    fetcherResults.classList.remove('hidden');
    updateFetcherSummary(parsedData);

    btnFetch.disabled = false;
    btnFetch.textContent = 'Extract CAD Details';
  }, 150);
});

btnCopy.addEventListener('click', async () => {
  const text = extractedTextArea.value;
  if (!text) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }

    const originalText = btnCopy.innerHTML;
    btnCopy.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied!';
    setTimeout(() => {
      btnCopy.innerHTML = originalText;
    }, 1800);
  } catch (error) {
    console.error('Copy failed:', error);
    alert('Copy failed. Please select the text manually.');
  }
});

btnDownload.addEventListener('click', () => {
  const text = extractedTextArea.value;
  if (!text) return;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cad_details.txt';
  link.click();
  URL.revokeObjectURL(url);
});

btnResetFetcher.addEventListener('click', () => {
  appState.fetcherHtmlData = null;
  htmlUpload.value = '';
  htmlFilename.textContent = 'Upload Systemize HTML';
  extractedTextArea.value = '';
  extractedFieldList.innerHTML = '';
  fetcherResults.classList.add('hidden');
  btnFetch.classList.add('hidden');
  setStatus(fetcherStatus, 'Waiting for HTML', 'neutral');
  fetcherSummary.textContent = 'Upload a Systemize HTML file to begin.';
  fetcherFieldSummary.textContent = 'Ready';
});

checkerHtmlUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.html')) {
    alert('Please upload a valid HTML file.');
    checkerHtmlUpload.value = '';
    return;
  }

  checkerHtmlFilename.textContent = file.name;
  const reader = new FileReader();
  reader.onload = (event) => {
    appState.checkerHtmlData = event.target.result;
    checkerSummary.textContent = 'HTML loaded. Ready for PDF comparison.';
    setStatus(checkerStatus, 'HTML ready', 'success');
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
    checkerSummary.textContent = 'PDF loaded. Ready for comparison.';
    setStatus(checkerStatus, 'PDF ready', 'success');
    updateCheckerAvailability();
  };
  reader.readAsArrayBuffer(file);
});

btnCrosscheck.addEventListener('click', async () => {
  if (!(appState.checkerHtmlData && appState.pdfData)) {
    alert('Please upload both an HTML file and a PDF file before running the crosschecker.');
    return;
  }

  btnCrosscheck.classList.add('hidden');
  processingState.classList.remove('hidden');
  resultsContainer.classList.add('hidden');

  try {
    const extractedHTML = parseHTMLForChecker(appState.checkerHtmlData);
    const extractedPDF = await parsePDF(appState.pdfData);
    renderResults(extractedHTML, extractedPDF);
  } catch (err) {
    console.error('Error during crosscheck:', err);
    alert('An error occurred during parsing. Check console for details.');
  } finally {
    processingState.classList.add('hidden');
    btnCrosscheck.classList.remove('hidden');
  }
});

btnResetChecker.addEventListener('click', () => {
  appState.checkerHtmlData = null;
  appState.pdfData = null;
  checkerHtmlUpload.value = '';
  pdfUpload.value = '';
  checkerHtmlFilename.textContent = 'Upload HTML';
  pdfFilename.textContent = 'Upload PDF';
  resultsContainer.classList.add('hidden');
  btnCrosscheck.classList.add('hidden');
  setStatus(checkerStatus, 'Waiting for files', 'neutral');
  checkerSummary.textContent = 'Upload both an HTML and a PDF file to compare.';
  statusBadge.textContent = 'Pending';
  statusBadge.className = 'status-pill neutral';
  tableBody.innerHTML = '';
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
    const nextTr = tr ? tr.nextElementSibling : null;
    const addressCell = nextTr ? nextTr.querySelector('.pageInfoValue') : null;
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

function extractTitleBlockText(text) {
  const upperText = text.toUpperCase();
  const titleBlockStartMarkers = ['JOB NAME', 'JOB #', 'JOB NO', 'JOB NUMBER', 'JOB INFORMATION'];
  const titleBlockStopMarkers = ['DETAIL', 'SCALE', 'DRAWING', 'DIMENSION', 'ELEVATION', 'SECTION', 'PLAN', 'NORTH', 'FOOTING'];

  let startIndex = -1;
  for (const marker of titleBlockStartMarkers) {
    const index = upperText.indexOf(marker);
    if (index !== -1 && (startIndex === -1 || index < startIndex)) {
      startIndex = index;
    }
  }

  if (startIndex === -1) {
    return text;
  }

  let endIndex = text.length;
  for (const marker of titleBlockStopMarkers) {
    const index = upperText.indexOf(marker, startIndex + 1);
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
  }

  return text.slice(startIndex, endIndex).replace(/\s+/g, ' ').trim();
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

  const cleanedText = fullText.replace(/\s+/g, ' ').trim();
  const titleBlockText = extractTitleBlockText(cleanedText);
  const titleBlockUpper = titleBlockText.toUpperCase();

  const normalizeValue = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const getFirstLine = (value) => normalizeValue(value).split(/\s*\n\s*|\s{2,}/)[0] || 'NOT FOUND';

  const extractSingle = (patterns) => {
    for (const pattern of patterns) {
      const match = titleBlockUpper.match(pattern);
      if (match && match[1]) {
        return normalizeValue(match[1]);
      }
    }
    return 'NOT FOUND';
  };

  const extractBlockValue = (labelPattern, stopPatterns = []) => {
    const match = titleBlockUpper.match(labelPattern);
    if (!match || !match[1]) return 'NOT FOUND';

    let value = normalizeValue(match[1]);
    const extraStop = stopPatterns.length ? stopPatterns.join('|') : '';
    if (extraStop) {
      const stopMatch = value.match(new RegExp(`^(.*?)(?=\s+(?:${extraStop})\s*:|$)`, 'i'));
      if (stopMatch && stopMatch[1]) value = normalizeValue(stopMatch[1]);
    }

    return getFirstLine(value);
  };

  const data = {};

  data['JOB NAME'] = extractBlockValue(
    /JOB\s+NAME\s*[:\-]?\s*([\s\S]*?)(?=\s+JOB\s*#\s*[:\-]?|\s+PHONE\s*[:\-]?|\s+CONTRACTOR\s*[:\-]?|$)/i,
    ['JOB #', 'PHONE', 'CONTRACTOR']
  );

  data['JOB #'] = extractSingle([
    /JOB\s*#\s*[:\-]?\s*([A-Z0-9\-]+)/i,
    /JOB\s+NO\.?\s*[:\-]?\s*([A-Z0-9\-]+)/i,
    /JOB\s+NUMBER\s*[:\-]?\s*([A-Z0-9\-]+)/i
  ]);

  data.PHONE = extractSingle([
    /PHONE\s*[:\-]?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
    /TEL\s*[:\-]?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i
  ]);

  data.CONTRACTOR = extractBlockValue(
    /CONTRACTOR\s*[:\-]?\s*([\s\S]*?)(?=\s+CONTACT\s*[/\-]?\s*EXPEDITER\s*[:\-]?|\s+PHONE\s*[:\-]?|$)/i,
    ['CONTACT', 'PHONE']
  );

  data['CONTACT/EXPEDITER'] = extractBlockValue(
    /CONTACT\s*[/\-]?\s*EXPEDITER\s*[:\-]?\s*([\s\S]*?)(?=\s+PHONE\s*[:\-]?|\s+LOCK\s+BOX\s*[:\-]?|$)/i,
    ['PHONE', 'LOCK BOX']
  );

  data.MATERIAL = extractSingle([
    /MATERIAL\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i,
    /PRODUCT\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i,
    /(?:2CM|3CM)\s*[-/]\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i
  ]);

  data['EDGE PROFILE'] = extractSingle([
    /EDGE\s*PROFILE\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i,
    /PROFILE\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i
  ]);

  data.SINK = extractSingle([
    /SINK\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i,
    /SINK\s*MAKE\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i
  ]);

  data['FAUCET DRILLINGS'] = extractSingle([
    /FAUCET\s*DRILLINGS\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i,
    /DRILLINGS\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i
  ]);

  data['TEAR-OUT'] = extractSingle([
    /TEAR[-\s]*OUT\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i,
    /TEAROUT\s*[:\-]?\s*([A-Z0-9&/.,()'\-]+(?:\s+[A-Z0-9&/.,()'\-]+)*)/i
  ]);

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
    statusBadge.className = 'status-pill success';
    statusBadge.innerHTML = '<i class="fa-solid fa-shield-check"></i> Perfect Match';
  } else {
    statusBadge.className = 'status-pill error';
    statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${discrepancies} Discrepanc${discrepancies > 1 ? 'ies' : 'y'} Found`;
  }
}

function selectTab(tabName) {
  tabButtons.forEach(button => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  tabPanels.forEach(panel => {
    const isActive = panel.id === `${tabName}-panel`;
    panel.classList.toggle('active', isActive);
    if (isActive) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', 'hidden');
    }
  });
}

tabButtons.forEach(button => {
  button.addEventListener('click', () => selectTab(button.dataset.tab));
});

selectTab('fetcher');
setStatus(fetcherStatus, 'Waiting for HTML', 'neutral');
setStatus(checkerStatus, 'Waiting for files', 'neutral');
