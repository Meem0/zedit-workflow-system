ngapp.controller('workflowModalController', function($scope, workflowService) {
    $scope.modules = workflowService.getModules();

    $scope.selectModule = function(module) {
        $scope.module = module;
        $scope.workflows = module.workflows.map(workflowName => {
            return workflowService.getWorkflow(workflowName);
        });
    };

    $scope.selectWorkflow = function(workflow) {
        $scope.workflow = workflow;
    };
});
