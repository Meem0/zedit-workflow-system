ngapp.run(function(contextMenuFactory) {
    contextMenuFactory.treeViewItems.push({
        visible: (scope, items) => items.length > 0 && !items.last().divider,
        build: (scope, items) => items.push({ divider: true })
    });

    contextMenuFactory.treeViewItems.push({
        visible: (scope) => true,
        build: (scope, items) => {
            items.push({
                label: "Open Workflow",
                callback: () => scope.$emit('openModal', 'workflow', {
                    basePath: `${moduleUrl}/partials`,
                    selectedNodes: scope.selectedNodes
                })
            });
        }
    });
});
