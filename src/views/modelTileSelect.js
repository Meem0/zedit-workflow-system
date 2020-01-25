ngapp.run(function(workflowService) {
    let modelTileSelectController = function($scope) {
        $scope.tiles = $scope.stage.tiles();

        $scope.selectTile = function(tile) {
            tile.selected = true;
            $scope.model.weaponType = tile.label;
            $scope.validateStage();
        };
    };

    workflowService.addView('modelTileSelect', {
        templateUrl: `${moduleUrl}/partials/modelTileSelect.html`,
        controller: modelTileSelectController,
        validate: ({weaponType}) => weaponType && typeof(weaponType) === 'string'
    });
});