angular.module('escalonadorApp', [])
	.controller('EscalonadorController', ['$scope', '$interval', '$timeout', function($scope, $interval, $timeout) {
		var $escalonador = this;
		
		$escalonador.processos = [];		
		$escalonador.processos_finalizados = [];
		$escalonador.params = {
			quantum : 150,
			max_tempo_vida : 2000,
			processos_minuto : 60,
			io_bound : 25,
		};
		$escalonador.total_io_bound = 0;
		$escalonador.iCriarProcesso = null;
		$escalonador.tExecutarFila = null;
		$escalonador.indiceProcessoAtual = -1;
		
		$escalonador.addProcesso = function () {
			var wk = new Worker("js/processo.js");
			
			wk.onmessage = function(e) {
				$escalonador.executeMessage(e.data);
			};

			var pid = $escalonador.processos.length + 1;
			$escalonador.processos[pid-1] = {};
			$escalonador.processos[pid-1].worker = wk;
			var status_inicial = StatusProcesso.STATUS_NA_FILA;
			if (getRandomInt(0, 100) < $escalonador.params.io_bound) {
				status_inicial = StatusProcesso.STATUS_AGUARDANDO_IO;
			}
			$escalonador.processos[pid-1].dados = new Processo(pid, status_inicial, getRandomInt(1, $escalonador.params.max_tempo_vida));
			if (status_inicial.name == StatusProcesso.STATUS_AGUARDANDO_IO.name) {
				$escalonador.total_io_bound++;
			}

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
			$timeout.cancel($escalonador.tExecutarFila);

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
			$escalonador.iCriarProcesso = $interval(function() {
				$escalonador.addProcesso();
			}, 60000 / $escalonador.params.processos_minuto);
			
		}

		function resetQuantum () {
			$timeout.cancel($escalonador.tExecutarFila);
			$escalonador.tExecutarFila = $timeout(function() {
				if ($escalonador.processos[$escalonador.indiceProcessoAtual]) {
					$escalonador.processos[$escalonador.indiceProcessoAtual].worker.postMessage({
						action: "parar",
						params: null
					});
				}
				
			}, $escalonador.params.quantum);

		}

		function proximo () {
			$escalonador.indiceProcessoAtual++;
			if ($escalonador.indiceProcessoAtual == $escalonador.processos.length) {
				$escalonador.indiceProcessoAtual = 0;
			}

			while(typeof $escalonador.processos[$escalonador.indiceProcessoAtual] == 'undefined' ||	
					$escalonador.processos_finalizados.indexOf($escalonador.processos[$escalonador.indiceProcessoAtual].dados.pid) > -1 ||
					$escalonador.processos[$escalonador.indiceProcessoAtual].dados.status.name == StatusProcesso.STATUS_AGUARDANDO_IO.name) {
				// console.log($escalonador.processos[$escalonador.indiceProcessoAtual].dados);
				if ($escalonador.processos[$escalonador.indiceProcessoAtual] && $escalonador.processos[$escalonador.indiceProcessoAtual].dados.status.name == StatusProcesso.STATUS_AGUARDANDO_IO.name) {
					if ($escalonador.processos[$escalonador.indiceProcessoAtual].dados.ciclos_io_restantes < 1) {
						//ficou aguardando IO por 1 ciclo. agora vai pra fila
						$escalonador.processos[$escalonador.indiceProcessoAtual].dados.status = StatusProcesso.STATUS_NA_FILA;
						$escalonador.total_io_bound--;
					}
					$escalonador.processos[$escalonador.indiceProcessoAtual].dados.ciclos_io_restantes--;
				} else {
					delete $escalonador.processos[$escalonador.indiceProcessoAtual];//remove o processo da lista de execução, depois de 1 ciclo
				}
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
			} else {
				proximo();
			}
			
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
					
					$escalonador.processos[message.pid-1].dados.executado = message.executado;
					$escalonador.processos[message.pid-1].dados.status = StatusProcesso.STATUS_NA_FILA;
					$escalonador.processos[message.pid-1].dados.percentual_executado = parseFloat(Math.min($escalonador.processos[message.pid-1].dados.executado / $escalonador.processos[message.pid-1].dados.tempo_vida * 100, 100)).toFixed(2);
					proximo();
				break;
				case "processo_executando" :
					$escalonador.processos[message.processo.pid-1].dados.status = StatusProcesso.STATUS_EXECUTANDO;
					resetQuantum();
				break;
				case "processo_finalizado" :
					$escalonador.processos[message.pid-1].worker.terminate();//destruímos o worker (thread) pois alguns navegadores podem ter limite.
					$escalonador.processos_finalizados.push(message.pid);
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
	STATUS_AGUARDANDO_IO: {name: 'aguardando_io', label: 'Aguardando IO', css_class: 'progress-bar-danger'},
	STATUS_NA_FILA: {name: 'na_fila', label: 'Na Fila', css_class: 'progress-bar-warning'},
	STATUS_EXECUTANDO: {name: 'executando', label: 'Executando', css_class: 'progress-bar-info'},
	STATUS_FINALIZADO: {name: 'finalizado', label: 'Finalizado', css_class: 'progress-bar-success'}
};


Processo = (function() {

	Processo.prototype.pid = null;
	Processo.prototype.status = null;
	Processo.prototype.executado = 0;
	Processo.prototype.percentual_executado = 0;
	Processo.prototype.tempo_vida = 0;
	Processo.prototype.ciclos_io_restantes = 0;

	function Processo (pid, status, tempo_vida) {
		this.pid = pid;
		this.status = status;
		this.tempo_vida = tempo_vida;
		this.executado = 0;
		this.percentual_executado = 0;
		if (status.name == StatusProcesso.STATUS_AGUARDANDO_IO.name) {
			this.ciclos_io_restantes = 1;
		}
	}
	return Processo;
})();

Array.prototype.clear = function() {
    this.splice(0, this.length);
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
