ngapp.controller('workflowModalController', function($scope, workflowService) {
    let buildStages = function(workflow) {
        return workflow.stages.map(stage => ({
            ...stage,
            available: false
        }));
    };

    $scope.modules = workflowService.getModules();
    $scope.moduleName = '';
    $scope.workflowName = '';

    // scope functions
    $scope.selectModule = function(module) {
        $scope.module = module;
        $scope.moduleName = module.name;
        $scope.workflows = module.workflows.map(workflowName => {
            return workflowService.getWorkflow(workflowName);
        });
    };

    $scope.selectWorkflow = function(workflow) {
        $scope.workflowName = workflow.name;
        $scope.workflow = workflow;
        $scope.model = {};
        $scope.stages = buildStages(workflow);
        $scope.stages[0].available = true;
        $scope.stageIndex = 0;
    };

    $scope.selectStage = function(index) {
        if (!$scope.stages[index].available ||
            $scope.stageIndex === index) return;
        $scope.stageIndex = index;
    };

    $scope.previousStage = function() {
        if ($scope.stageIndex === 0) return;
        $scope.stageIndex = $scope.stageIndex - 1;
    };

    $scope.nextStage = function() {
        if ($scope.stageIndex >= $scope.stages.length) return;
        $scope.stageIndex = $scope.stageIndex + 1;
    };

    $scope.finish = function() {
        $scope.workflow.finish($scope.model);
        $scope.$emit('closeModal');
        $scope.$root.$broadcast('reloadGUI');
    };

    $scope.validateStage = function(stage = $scope.stage) {
        if (!stage.available) {
            return;
        }

        let view = workflowService.getView(stage.view);
        if (!view || typeof(view.validate) !== 'function') {
            stage.valid = true;
        }
        else {
            stage.valid = view.validate($scope.model, stage);
        }

        return stage.valid;
    };

    $scope.validateWorkflow = function() {
        let workflowValid = true;
        $scope.stages.forEach(stage => {
            workflowValid &= validateStage(stage);
        });
        return workflowValid;
    };

    $scope.loadView = function() {
        if (!$scope.stage || typeof $scope.stage.view !== 'string') return;
        let view = workflowService.getView($scope.stage.view);
        $scope.view = {name: $scope.stage.view, ...view};
        $scope.validateStage();
    };

    $scope.$on('nextStage', $scope.nextStage);

    $scope.$on('startSubflow', (e, workflow) => {
        $scope.model[workflow.model] = {};
        $scope.stages = buildStages(workflow);
        $scope.nextStage();
    });

    $scope.$watch('stageIndex', () => {
        if (!$scope.stages) {
            return;
        }

        let maxStageIndex = $scope.stages.length - 1;
        $scope.stage = $scope.stages[$scope.stageIndex];
        $scope.stage.available = true;
        $scope.showPrevious = $scope.stageIndex > 0;
        $scope.showNext = $scope.stageIndex < maxStageIndex;
        $scope.showFinish = $scope.stageIndex === maxStageIndex;
        $scope.loadView();
    });
});