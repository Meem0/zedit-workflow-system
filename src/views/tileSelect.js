ngapp.run(function(workflowService) {
    let tileSelectController = function($scope) {
        $scope.selectTile = function(tile) {
            if ($scope.tiles) {
                $scope.tiles.forEach(tile => tile.selected = false);
                tile.selected = true;
            }
            $scope.model.selectedTile = tile.label;
        };
        
        $scope.tiles = $scope.input.tiles ? $scope.input.tiles() : [];
        
        if ($scope.model.selectedTile) {
            let selectedTile = $scope.tiles.find(({label}) => label === $scope.model.selectedTile);
            if (selectedTile) {
                $scope.selectTile(selectedTile);
            }
        }
    };

    workflowService.addView('tileSelect', {
        templateUrl: `${moduleUrl}/partials/tileSelect.html`,
        controller: tileSelectController,
        process: function(input, model) {
            if (!input.modelKey || !model.selectedTile) {
                return;
            }
            return { [input.modelKey]: model.selectedTile };
        }
    });
});
