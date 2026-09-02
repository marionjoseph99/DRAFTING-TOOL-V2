const htmlUpload = document.getElementById('html-upload');
const htmlFilename = document.getElementById('html-filename');
const btnFetch = document.getElementById('btn-fetch');
const btnReset = document.getElementById('btn-reset');
const btnDemo = document.getElementById('btn-demo');
const btnDownload = document.getElementById('btn-download');
const fetcherResults = document.getElementById('fetcher-results');
const extractedTextArea = document.getElementById('extracted-text-area');
const btnCopy = document.getElementById('btn-copy');
const extractionStatus = document.getElementById('extraction-status');
const validationSummary = document.getElementById('validation-summary');
const fieldSummary = document.getElementById('field-summary');
const uploadBox = document.getElementById('upload-box');

let htmlData = null;

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

function setStatus(message, type = 'neutral') {
  extractionStatus.textContent = message;
  extractionStatus.className = `status-pill ${type}`;
}

function updateValidationSummary(data) {
  const fieldsPresent = REQUIRED_FIELDS.filter(field => {
    const value = data[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });

  const missingFields = REQUIRED_FIELDS.filter(field => !fieldsPresent.includes(field));
  const foundCount = fieldsPresent.length;
  const totalCount = REQUIRED_FIELDS.length;

  if (foundCount === totalCount) {
    setStatus('Extraction complete', 'success');
    validationSummary.textContent = `All ${totalCount} core fields were found.`;
  } else if (foundCount >= totalCount * 0.6) {
    setStatus('Partial extraction', 'warning');
    validationSummary.textContent = `Found ${foundCount}/${totalCount} fields. Review: ${missingFields.join(', ')}`;
  } else {
    setStatus('Needs review', 'error');
    validationSummary.textContent = `Only ${foundCount}/${totalCount} fields were found. Review: ${missingFields.join(', ')}`;
  }

  fieldSummary.textContent = `${foundCount}/${totalCount} fields extracted`;
}

function setUploadState(isActive) {
  uploadBox.classList.toggle('drag-over', isActive);
}

['dragenter', 'dragover'].forEach(eventName => {
  uploadBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    setUploadState(true);
  });
});

['dragleave', 'drop'].forEach(eventName => {
  uploadBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    setUploadState(false);
  });
});

uploadBox.addEventListener('drop', (event) => {
  const file = event.dataTransfer.files[0];
  if (file) handleHtmlFile(file);
});

function handleHtmlFile(file) {
  if (!file) return;

  if (!file.name.endsWith('.html')) {
    alert('Please upload a valid HTML file.');
    htmlUpload.value = '';
    return;
  }

  htmlFilename.textContent = file.name;
  setStatus('Loading file...', 'neutral');

  const reader = new FileReader();
  reader.onload = (event) => {
    htmlData = event.target.result;
    btnFetch.classList.remove('hidden');
    validationSummary.textContent = 'HTML loaded. Ready to extract details.';
    setStatus('File ready', 'success');
  };
  reader.readAsText(file);
}

htmlUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  handleHtmlFile(file);
});

btnFetch.addEventListener('click', () => {
  if (!htmlData) return;

  setStatus('Extracting details...', 'neutral');
  btnFetch.disabled = true;
  btnFetch.textContent = 'Extracting...';

  setTimeout(() => {
    const parsedData = parseDetailedHTML(htmlData);
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
    fetcherResults.classList.remove('hidden');
    updateValidationSummary(parsedData);

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
      extractedTextArea.select();
      document.execCommand('copy');
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

btnReset.addEventListener('click', () => {
  htmlData = null;
  htmlUpload.value = '';
  htmlFilename.textContent = 'Upload Systemize HTML';
  extractedTextArea.value = '';
  fetcherResults.classList.add('hidden');
  btnFetch.classList.add('hidden');
  setStatus('Waiting for HTML', 'neutral');
  validationSummary.textContent = 'Upload a Systemize HTML file to begin.';
  fieldSummary.textContent = 'Ready';
});

btnDemo.addEventListener('click', () => {
  htmlData = demoHTML;
  htmlFilename.textContent = 'demo_systemize.html';
  btnFetch.classList.remove('hidden');
  validationSummary.textContent = 'Demo HTML loaded. Ready to extract details.';
  setStatus('Demo loaded', 'success');
  fieldSummary.textContent = 'Demo mode';
});

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
