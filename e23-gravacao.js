export function montarGravador(el) {
  const painel = el('section', undefined, 'notice');
  const estado = el('p', 'Gravação local. Se a responsável sair, outra pessoa pode iniciar um novo arquivo.');
  estado.setAttribute('role', 'status');
  const iniciar = el('button', 'Iniciar gravação');
  const parar = el('button', 'Parar e salvar');
  const arquivo = el('a', 'Baixar áudio novamente');
  arquivo.hidden = true;
  parar.disabled = true;
  painel.append(el('h3', 'Gravação da conversa do grupo'), el('p', 'Com a concordância de todas, selecione a aba do Meet e marque a opção de incluir o áudio da guia.'), iniciar, parar, estado, arquivo);
  let gravador, aba, microfone, contexto, url;
  function liberar() {
    for (const fluxo of [aba, microfone]) fluxo?.getTracks().forEach(trilha => trilha.stop());
    contexto?.close().catch(() => {});
    aba = microfone = contexto = null;
    iniciar.disabled = false;
    parar.disabled = true;
  }
  function finalizar() {
    if (gravador?.state === 'recording') {
      parar.disabled = true;
      gravador.stop();
    }
  }
  parar.onclick = finalizar;
  iniciar.onclick = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
      estado.textContent = 'Use o Chrome no computador para gravar.';
      return;
    }
    if (!confirm('Todas concordaram com a gravação desta conversa?')) return;
    iniciar.disabled = true;
    try {
      aba = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true, selfBrowserSurface: 'exclude', surfaceSwitching: 'exclude'});
      if (aba.getVideoTracks()[0]?.getSettings().displaySurface !== 'browser' || !aba.getAudioTracks().length) {
        throw Error('Selecione a aba do Meet e inclua o áudio da guia.');
      }
      microfone = await navigator.mediaDevices.getUserMedia({audio: true});
      if (!painel.isConnected || aba.getAudioTracks()[0].readyState !== 'live') throw Error('A captura foi interrompida. Tente novamente.');
      contexto = new AudioContext();
      const destino = contexto.createMediaStreamDestination();
      for (const fluxo of [aba, microfone]) {
        contexto.createMediaStreamSource(new MediaStream(fluxo.getAudioTracks())).connect(destino);
      }
      await contexto.resume();
      const partes = [];
      gravador = new MediaRecorder(destino.stream);
      gravador.ondataavailable = evento => { if (evento.data.size) partes.push(evento.data); };
      gravador.onerror = () => { estado.textContent = 'O navegador encontrou um erro ao gravar.'; finalizar(); };
      gravador.onstop = () => {
        liberar();
        if (!partes.length) {
          estado.textContent = 'Nenhum áudio foi gravado.';
          return;
        }
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(new Blob(partes, {type: gravador.mimeType}));
        arquivo.href = url;
        arquivo.download = 'Por-Escrito-audio-' + new Date().toISOString().replace(/[:.]/g, '-') + '.webm';
        arquivo.hidden = false;
        arquivo.click();
        estado.textContent = 'Gravação encerrada. Confira o arquivo de áudio nos downloads.';
      };
      for (const fluxo of [aba, microfone]) fluxo.getTracks().forEach(trilha => trilha.addEventListener('ended', finalizar));
      const vigiarSaida = new MutationObserver(() => {
        if (!painel.isConnected) finalizar();
      });
      vigiarSaida.observe(document.body, {childList: true, subtree: true});
      gravador.addEventListener('stop', () => vigiarSaida.disconnect(), {once: true});
      try { gravador.start(1000); } catch (erro) { vigiarSaida.disconnect(); throw erro; }
      parar.disabled = false;
      estado.textContent = 'Gravando. Mantenha esta aba aberta até parar e salvar.';
    } catch (erro) {
      liberar();
      estado.textContent = erro.name === 'NotAllowedError' ? 'Captura cancelada ou permissão negada. Você pode tentar novamente.' : erro.message;
    }
  };
  return painel;
}
