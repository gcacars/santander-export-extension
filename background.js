browser.pageAction.onClicked.addListener(async function (tab) {
  try {
    console.log('Iniciado exportação de OFX Santander');

    // Find tab
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    const tabId = tabs[0].id;

    // Load scripts
    await browser.tabs.executeScript(tabId, {
      file: "FileSaver.min.js"
    });

    await browser.tabs.executeScript(tabId, {
      file: "content.js"
    });

    const result = await browser.tabs.sendMessage(tabId, 'export-ofx');
    console.log('Result', result);

    // Prepare message
    let message = '';

    if (result?.error) {
      message = `Ocorreu o erro: ${result.error}`;
    } else if (result?.data?.filename) {
      message = `Arquivo ${result.data.filename} foi exportado com sucesso.`;
    } else {
      message = 'Ocorreu um erro desconhecido.';
    }

    // Notify
    await browser.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: result?.error ? 'Erro :(' : 'Exportado!',
      message: message,
    });
  } catch (er) {
    console.error(er);

    await browser.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: 'Erro :(',
      message: `Ocorreu um erro ao exportar o arquivo OFX: ${er.message}`,
    });
  }
});
