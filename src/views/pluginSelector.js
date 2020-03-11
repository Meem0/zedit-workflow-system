ngapp.run(function(workflowService) {
    let getNewFileName = function() {
        let attempt = 0;
        while (true) {
            const attemptString = attempt ? ` (${attempt})` : '';
            const filename = `New File${attemptString}.esp`;
            if (!xelib.HasElement(0, filename)) {
                return filename;
            }
            ++attempt;
        }
    };

    let pluginSelectorController = function($scope) {
        // populate plugins list with exisiting, editable plugins
        let plugins = [];
        xelib.WithEachHandle(xelib.GetElements(), function(file) {
            if (xelib.GetIsEditable(file)) {
                plugins.push({
                    filename: xelib.Name(file),
                    loadOrder: xelib.GetFileLoadOrder(file)
                });
            }
        });

        $scope.selection = {};

        // if the model already has a plugin specified, try to find it in the existing plugins and select it if found
        if ($scope.model.plugin) {
            $scope.selection.plugin = plugins.find(({filename}) => filename === $scope.model.plugin);
        }

        // add an option for creating a new plugin
        // if the model has a plugin specified and we didn't find it in the existing plugins, use it as the default name
        plugins.push({
            filename: $scope.model.plugin && !$scope.selection.plugin ? $scope.model.plugin : getNewFileName(),
            isAddFile: true
        });

        $scope.selectPlugin = function() {
            $scope.model.plugin = $scope.selection.plugin.filename;
        }

        // by default, select the "new plugin" option
        if (!$scope.selection.plugin) {
            $scope.selection.plugin = plugins[plugins.length - 1];
        }
        $scope.plugins = plugins;
        $scope.selectPlugin();
    };

    workflowService.addView('pluginSelector', {
        templateUrl: `${moduleUrl}/partials/pluginSelector.html`,
        controller: pluginSelectorController,
        process: function(input, model) {
            let plugin = model.plugin;
            if (!plugin || typeof(plugin) !== 'string') {
                return;
            }
    
            return xelib.WithHandle(xelib.GetElement(0, plugin), fileId => {
                return !fileId || xelib.GetIsEditable(fileId) ? { plugin } : undefined;
            });
        }
    });
});
