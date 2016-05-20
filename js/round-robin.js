angular.module('escalonadorApp', [])
	.controller('EscalonadorController', ['$scope', '$interval', function($scope, $interval) {
		var $escalonador = this;
		
		$escalonador.processos = [];		
		$escalonador.processos_finalizados = [];
		$escalonador.params = {
			quantum : 500,
			max_tempo_vida : 5000,
			processos_minuto : 20,
			io_bound : 20,
		};
		$escalonador.iCriarProcesso = null;
		$escalonador.iExecutarFila = null;
		$escalonador.indiceProcessoAtual = -1;
		
		$escalonador.addProcesso = function () {
			var wk = new Worker("js/processo.js");
			
			wk.onmessage = function(e) {
				$escalonador.executeMessage(e.data);
			};

			var pid = $escalonador.processos.length + 1;
			$escalonador.processos[pid-1] = {};
			$escalonador.processos[pid-1].worker = wk;
			$escalonador.processos[pid-1].dados = new Processo(pid, StatusProcesso.STATUS_AGUARDANDO_IO, getRandomInt(1, $escalonador.params.max_tempo_vida));

			wk.postMessage({
				action: "criar",
				params: $escalonador.params,
				processo: $escalonador.processos[pid-1].dados
			});
		}

		$escalonador.simular = function () {
			$escalonador.processos.clear();
			$escalonador.processos_finalizados.clear();
			$escalonador.indiceProcessoAtual = -1;
			$interval.cancel($escalonador.iCriarProcesso);
			$interval.cancel($escalonador.iExecutarFila);

			var parametros = $escalonador.params;
			if (parametros.quantum < 1) {
				alert('Valor mínimo do campo Quantum é 1');
				return false;
			};

			if (parametros.max_tempo_vida < 2) {
				alert('Valor mínimo do campo Máx. tempo de vida é 2');
				return false;
			};

			if (parametros.processos_minuto < 1) {
				alert('Valor mínimo do campo Processos / minuto é 1');
				return false;
			};

			if (parametros.io_bound < 0) {
				alert('Valor mínimo do campo IO Bound é 0');
				return false;
			};

			$escalonador.addProcesso();
			// proximo();
			$escalonador.iCriarProcesso = $interval(function() {
				$escalonador.addProcesso();
			}, 60000 / $escalonador.params.processos_minuto);
			
			$escalonador.iExecutarFila = $interval(function() {
				$escalonador.processos[$escalonador.indiceProcessoAtual].worker.postMessage({
					action: "parar",
					params: null
				});
				
			}, $escalonador.params.quantum);

		}

		function proximo () {
			$escalonador.indiceProcessoAtual++;
			if ($escalonador.indiceProcessoAtual == $escalonador.processos.length) {
				$escalonador.indiceProcessoAtual = 0;
			}

			while($escalonador.processos_finalizados.indexOf($escalonador.processos[$escalonador.indiceProcessoAtual].dados.pid) > -1) {
				$escalonador.indiceProcessoAtual++;
				if ($escalonador.indiceProcessoAtual == $escalonador.processos.length) {
					$escalonador.indiceProcessoAtual = -1;
					break;
				}
			}
			if ($escalonador.indiceProcessoAtual > -1) {
				$escalonador.processos[$escalonador.indiceProcessoAtual].worker.postMessage({
					action: "executar",
					params: $escalonador.params
				});
			};
			
		}


		$escalonador.executeMessage = function (message) {
			var acao = message.action;
			var params = message.params;
			switch (acao) {
				case "processo_criado" :
					$escalonador.processos[message.processo.pid - 1].dados = message.processo;
					if ($escalonador.indiceProcessoAtual == -1) {
						proximo();
					}
				break;
				case "processo_parado" :
					// console.log(message);
					$escalonador.processos[message.pid-1].dados.executado = message.executado;
					// console.log($escalonador.processos[message.pid-1].dados.executado, $escalonador.processos[message.pid-1].tempo_vida);
					$escalonador.processos[message.pid-1].dados.percentual_executado = parseFloat(Math.min($escalonador.processos[message.pid-1].dados.executado / $escalonador.processos[message.pid-1].dados.tempo_vida * 100, 100)).toFixed(2);
					proximo();
				break;
				case "processo_finalizado" :
					$escalonador.processos[message.pid-1].worker.terminate();
					$escalonador.processos_finalizados.push(message.pid);
					// console.log($escalonador.processos.length);
					// delete $escalonador.processos[message.pid-1];
					// console.log($escalonador.processos.length);
					// console.log($escalonador.processos);
					$escalonador.processos[message.pid-1].dados.status = StatusProcesso.STATUS_FINALIZADO;
					$escalonador.processos[message.pid-1].dados.executado = message.executado;
					$escalonador.processos[message.pid-1].dados.percentual_executado = parseFloat(Math.min($escalonador.processos[message.pid-1].dados.executado / $escalonador.processos[message.pid-1].dados.tempo_vida * 100, 100)).toFixed(2);
					proximo();
				break;
			}
			$scope.$apply();
		}
		
	}]);

var StatusProcesso = {
	STATUS_AGUARDANDO_IO: {name: 'aguardando_io', label: 'Aguardando IO'},
	STATUS_NA_FILA: {name: 'na_fila', label: 'Na Fila'},
	STATUS_EXECUTANDO: {name: 'executando', label: 'Executando'},
	STATUS_FINALIZADO: {name: 'finalizado', label: 'Finalizado'}
};


Processo = (function() {

	Processo.prototype.pid = null;
	Processo.prototype.status = null;
	Processo.prototype.executado = 0;
	Processo.prototype.percentual_executado = 0;
	Processo.prototype.tempo_vida = 0;

	Processo.prototype.STATUS_AGUARDANDO_IO = {name: 'aguardando_io', label: 'Aguardando IO'};
	Processo.prototype.STATUS_NA_FILA = {name: 'na_fila', label: 'Na Fila'};
	Processo.prototype.STATUS_EXECUTANDO = {name: 'executando', label: 'Executando'};
	Processo.prototype.STATUS_FINALIZADO = {name: 'finalizado', label: 'Finalizado'};
	function Processo (pid, status, tempo_vida) {
		this.pid = pid;
		this.status = status;
		this.tempo_vida = tempo_vida;
		this.executado = 0;
		this.percentual_executado = 0;
		// this.tempo_vida = getRandomInt(1, params.max_tempo_vida);
		// executado: 0,
		// pid: 0,
		// percentual_executado: 0
	}
	return Processo;
})();

Array.prototype.clear = function() {
    this.splice(0, this.length);
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}