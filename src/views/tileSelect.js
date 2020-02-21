ngapp.run(function(workflowService) {
    let tileSelectController = function($scope) {
        $scope.selectTile = function(tile) {
            $scope.tiles.forEach(tile => tile.selected = false);
            tile.selected = true;
            $scope.model[$scope.stage.modelKey] = tile.label;
        };
        
        $scope.tiles = $scope.stage.tiles();
        
        if ($scope.model[$scope.stage.modelKey]) {
            let selectedTile = $scope.tiles.find(tile => tile.label === $scope.model[$scope.stage.modelKey]);
            if (selectedTile) {
                $scope.selectTile(selectedTile);
            }
        }
    };

    workflowService.addView('tileSelect', {
        templateUrl: `${moduleUrl}/partials/tileSelect.html`,
        controller: tileSelectController,
        process: function(input, model, stage) {
            if (!stage.modelKey || typeof(model[stage.modelKey] !== 'string')) {
                return;
            }
            return { [stage.modelKey]: model[stage.modelKey] };
        }
    });
});
