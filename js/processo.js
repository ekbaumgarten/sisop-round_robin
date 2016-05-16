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
	// console.log(message);

	switch (acao) {
		case "criar" :
			processo.pid = message.pid;
			
			processo.tempo_vida = Math.random(1, params.max_tempo_vida);
			
			postMessage({
				action: "atualiza_processo",
				params: {
					"processo": processo					
				}
			});
		break;
	}

}