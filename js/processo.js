var processo = null;
var timeoutExecute = null;
var executeInitTime = null;

var onmessage = function (e) {
	executeMessage(e.data);
}

var finalizar = function () {
	postMessage({
		action: "processo_finalizado",
		pid: processo.pid,
		executado:  Math.min(processo.tempo_vida, processo.executado)
	});
}

var parar = function () {
	clearTimeout(timeoutExecute);
	processo.executado = processo.executado + (Math.max(1, Date.now() - executeInitTime));
	if (processo.executado >= processo.tempo_vida) {
		finalizar();
	} else {
		postMessage({
			action: "processo_parado",
			pid: processo.pid,
			executado:  Math.min(processo.tempo_vida, processo.executado)
		});
	}
}

var executeMessage = function (message) {

	var acao = message.action;
	var params = message.params;

	switch (acao) {
		case "criar" :
			processo = message.processo;			
			postMessage({
				action: "processo_criado",
				processo: processo					
			});
		break;
		case "executar" :
			
			executeInitTime = Date.now();
			postMessage({
				action: "processo_executando",
				processo: processo					
			});
			
			timeoutExecute = setTimeout(function () {
				parar();
			}, processo.tempo_vida - processo.executado);
		break;
		case "parar":
			parar();

		break;
	}

}