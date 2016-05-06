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

		$escalonador.addProcesso = function () {
			var processo = {
				pid : $escalonador.processos.length + 1,
				status: {name: 'aguardando', label: 'Aguardando'},
				tempo_vida: Math.random(1, $escalonador.params.max_tempo_vida),
				executado: 0,
				percentual_executado: 0
			}

			$escalonador.processos.push(processo);
		}

		var iCriarProcesso;
		$escalonador.simular = function () {
			$escalonador.processos.clear();
			$interval.cancel(iCriarProcesso);

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

			iCriarProcesso = $interval(function() {
				console.log('add');
				$escalonador.addProcesso();
			}, 60000 / $escalonador.params.processos_minuto);
			
		}
		
	}]);

Array.prototype.clear = function() {
    this.splice(0, this.length);
};