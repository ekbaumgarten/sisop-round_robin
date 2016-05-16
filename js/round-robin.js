angular.module('escalonadorApp', [])
	.controller('EscalonadorController', ['$scope', '$interval', function($scope, $interval) {
		var $escalonador = this;
		
		$escalonador.processos = [];		
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
				$escalonador.executeMessage(e.data); //Será executada esta função (aqui no main)
			};

			var pid = $escalonador.processos.length + 1;

			$escalonador.processos[pid-1] = {};
			$escalonador.processos[pid-1].worker = wk;
			// $escalonador.processos[pid - 1].dados = {};

			wk.postMessage({
				action: "criar",
				params: $escalonador.params,
				pid: pid
			});
		}

		$escalonador.simular = function () {
			$escalonador.processos.clear();
			$interval.cancel($escalonador.iCriarProcesso);

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
			console.log($escalonador.indiceProcessoAtual);
			$escalonador.processos[$escalonador.indiceProcessoAtual].worker.postMessage({
				action: "executar",
				params: null
			});
		}


		$escalonador.executeMessage = function (message) {
			var acao = message.action;
			var params = message.params;
			switch (acao) {
				case "atualiza_processo" :
					$escalonador.processos[params.processo.pid - 1].dados = params.processo;
					console.log($escalonador.processos[params.processo.pid - 1].dados);
					// console.log()
					if ($escalonador.indiceProcessoAtual == -1) {
						proximo();
					}
				break;
				case "processo_finalizado" :
					proximo();
				break;
			}
			$scope.$apply();
		}
		
	}]);

Array.prototype.clear = function() {
    this.splice(0, this.length);
};