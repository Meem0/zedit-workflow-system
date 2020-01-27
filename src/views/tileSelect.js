ngapp.run(function(workflowService) {
    let tileSelectController = function($scope) {
        let modelKey = $scope.stage.modelKey;
        $scope.tiles = $scope.stage.tiles();

        $scope.selectTile = function(tile) {
            tile.selected = true;
            $scope.model[modelKey] = tile.label;
            $scope.validateStage();
        };
    };

    workflowService.addView('tileSelect', {
        templateUrl: `${moduleUrl}/partials/tileSelect.html`,
        controller: tileSelectController,
        validate: (model, stage) => stage.modelKey && model[stage.modelKey] && typeof(model[stage.modelKey]) === 'string'
    });
});