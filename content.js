// Portuguese months
var ptMonths = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Parse a string date in portuguese.
 *
 * @author Gabriel Anderson
 * @date 2022-07-26
 * @param {string} value The date like _Segunda, 02 de março de 2022_
 * @return {Date} Return parsed date or `null`.
 */
function parsePortugueseDateStr(value) {
  const [, day, month, year] = value.match(/.+,\s?(\d{2})+\s?de\s?([A-z\u00C0-\u00ff]+)\s?de\s?(\d{4})+/);
  const monthInt = ptMonths.indexOf(month.toLowerCase());
  console.log(`Parse date ${value}: Day: ${day}, Month: ${month} (index: ${monthInt}), Year: ${year}`);
  return new Date(year, monthInt, day);
}

/**
 * Convert a date to the format of yyyymmdd.
 *
 * @author Gabriel Anderson
 * @date 2022-07-26
 * @param {Date} date The date object
 * @return {string} The date formatted.
 */
function yyyymmdd(date) {
  const day = (date.getDate()).toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  console.log(`Convert date ${date}: Day: ${day}, Month: ${month}`);
  return `${date.getFullYear()}${month}${day}`;
}

/**
 * Parse a string with monetary value.
 *
 * @author Gabriel Anderson
 * @date 2022-07-26
 * @param {string} val A monetary value, like _R$&nbsp;150,00_
 * @return {number} The parsed value.
 */
function parseMonetaryValue(val) {
  const number = val.match(/[-\d+\.]+,\d+/);
  const converted = number.length > 0 ? number[0].replace('.', '').replace(',', '.') : 0;
  return parseFloat(converted);
}

/**
 * Parse screen HTML and get the content.
 *
 * @author Gabriel Anderson
 * @date 2022-07-26
 * @return {object[]} The list of all card items.
 */
function getContent() {
  const items = [];

  // Save the last parsed date and card for nested items
  let lastCard = '';
  let lastDate = null;
  let startDate = null;

  console.log('Getting content...');
  const creditCardElement = document.querySelector('mfe-credit-card-payment-element').shadowRoot;

  creditCardElement.querySelectorAll('dss-list').forEach((el) => {
    // check for new date
    if (el.previousElementSibling && el.previousElementSibling.classList.contains('expensesOfDay')) {
      const date = el.previousElementSibling.textContent.trim();

      // Subtotal
      if (!date) return;

      lastDate = parsePortugueseDateStr(date);
      console.log(`Date changed to: ${lastDate}`);

      // Set initial date
      if (!startDate) startDate = lastDate;
    }

    // get amount
    const amount = parseMonetaryValue(el.querySelector('dss-list-item-content').textContent);

    items.push({
      date: lastDate,
      title: el.querySelector('dss-list-item-title').textContent,
      amount: amount * -1, // invert the signal
      type: amount < 0 ? 'CREDIT' : 'DEBIT',
    });
  });

  // set final date
  const endDate = lastDate;

  return {
    items,
    startDate,
    endDate,
  };
}

function headerOFX() {
  console.log('Preparing header');
  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE
<OFX>
	<SIGNONMSGSRSV1>
		<SONRS>
			<STATUS>
				<CODE>0
				<SEVERITY>INFO
			</STATUS>
			<DTSERVER>${yyyymmdd(new Date())}000000[-3:GMT]
			<LANGUAGE>POR
			<FI>
				<ORG>SANTANDER
				<FID>SANTANDER
			</FI>
		</SONRS>
	</SIGNONMSGSRSV1>
  <CREDITCARDMSGSRSV1>
    <CCSTMTTRNRS>
      <TRNUID>1001
        <STATUS>
          <CODE>0
          <SEVERITY>INFO
        </STATUS>
        <CCSTMTRS>
          <CURDEF>BRL
          <BANKTRANLIST>
          `;
}

function footerOFX() {
  console.log('Preparing footer');
  return `</BANKTRANLIST>
      </CCSTMTRS>
    </CCSTMTTRNRS>
  </CREDITCARDMSGSRSV1>
</OFX>`
}

/**
 * Mount the OFX file after get contents from screen.
 *
 * @author Gabriel Anderson
 * @date 2022-07-27
 * @return {object} The filename generated.
 */
function exportOfx() {
  const { items, startDate, endDate } = getContent();
  let file = headerOFX();

  console.log(`Creating content for ${items.length} items.`, items);

  items.forEach((l) => {
    file += ` <STMTTRN>
              <TRNTYPE>${l.type}
              <DTPOSTED>${yyyymmdd(l.date)}000000
              <TRNAMT>${l.amount.toFixed(2).replace('.', ',')}
              <MEMO>${l.title.replace(/\s/g, ' ').replace(/ +(?= )/g, '')}
            </STMTTRN>
          `;
  });

  file += footerOFX();

  const blob = new Blob([file], {
    type: 'text/plain;charset=utf-8',
  });
  console.log('Blob created');

  const filename = `santander_${yyyymmdd(startDate)}-${yyyymmdd(endDate)}.ofx`;
  console.log(`Filename is: ${filename}`);

  saveAs(blob, filename);
  console.log('Saved!');

  return {
    data: {
      filename,
    },
  };
}

// Listen to events
browser.runtime.onMessage.addListener(function (msg) {
  console.log(`Received action: ${msg}`);

  try {
    if (msg === 'export-ofx') {
      return Promise.resolve(exportOfx());
    }
  } catch (ex) {
    console.error(ex);
    return Promise.reject({
      error: ex.message,
    });
  }

  return true;
});
