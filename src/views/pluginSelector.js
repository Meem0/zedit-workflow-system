ngapp.run(function(workflowService) {
    let pluginSelectorController = function($scope) {
        let plugins = [];
        xelib.WithEachHandle(xelib.GetElements(), function(file) {
            if (!xelib.GetIsEditable(file)) return;
            plugins.push({
                filename: xelib.Name(file),
                loadOrder: xelib.GetFileLoadOrder(file)
            });
        });
        plugins.push({
            filename: 'New File.esp',
            isAddFile: true
        });

        $scope.selectPlugin = function() {
            $scope.model.plugin = $scope.selection.plugin.filename;
            $scope.validateStage();
        }

        $scope.selection = {plugin: plugins[plugins.length - 1]};
        $scope.plugins = plugins;
        $scope.selectPlugin();
    };

    workflowService.addView('pluginSelector', {
        templateUrl: `${moduleUrl}/partials/pluginSelector.html`,
        controller: pluginSelectorController,
        validate: function({plugin}) {
            if (!plugin || typeof(plugin) !== 'string') {
                return false;
            }
    
            return xelib.WithHandle(xelib.GetElement(0, plugin), fileId => !fileId || xelib.GetIsEditable(fileId));
        }
    });
});