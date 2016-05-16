var processo = {
	status: {name: 'aguardando', label: 'Aguardando'},
	executado: 0,
	pid: 0,
	percentual_executado: 0
}

var onmessage = function (e) {
	executeMessage(e.data);
}

var executeMessage = function (message) {

	var acao = message.action;
	var params = message.params;

	switch (acao) {
		case "criar" :
			processo.pid = message.pid;
			
			processo.tempo_vida = getRandomInt(1, params.max_tempo_vida);
			
			postMessage({
				action: "atualiza_processo",
				params: {
					"processo": processo					
				}
			});
		break;
		case "executar" :
			console.log('Executar ' + processo.pid);
		break
		case "parar":
			console.log('parar');
			postMessage({
				action: "processo_finalizado"
			});
		break;
	}

}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}