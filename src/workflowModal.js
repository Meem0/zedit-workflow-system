ngapp.controller('workflowModalController', function($scope, workflowService) {
    let buildStages = function(workflow) {
        return workflow.stages.map(stage => ({
            ...stage,
            available: false
        }));
    };
    
    let getStageByName = function(stages, stageName) {
        return (Array.isArray(stages) && typeof(stageName) === 'string'
            ? stages.find(({name}) => name === stageName)
            : undefined);
    };
    
    let getStageIndexByName = function(stages, stageName) {
        return (Array.isArray(stages) && typeof(stageName) === 'string'
            ? stages.findIndex(({name}) => name === stageName)
            : -1);
    };

    let loadView = function(scope, viewName) {
        if (typeof(viewName) !== 'string') {
            return;
        }
        let view = workflowService.getView(viewName);
        scope.view = {
            name: viewName,
            ...view
        };
    };
    
    let getNextStage = function(scope) {
        if (!scope) {
            return '';
        }
        
        let currentStageName = scope.stage ? scope.stage.name : '';
        let nextStageName;
        if (scope.workflow && typeof(scope.workflow.getNextStage) === 'function') {
            nextStageName = scope.workflow.getNextStage(currentStageName, scope.model);
        }
        if (nextStageName === undefined && scope.stages && scope.stages.length > 0) {
            nextStageName = '';
            if (currentStageName) {
                const currentStageIndex = getStageIndexByName(scope.stages, currentStageName);
                if (currentStageIndex + 1 < scope.stages.length) {
                    nextStageName = scope.stages[currentStageIndex + 1].name;
                }
            }
            else {
                nextStageName = scope.stages[0].name;
            }
        }
        return nextStageName;
    };
    
    let setStage = function(scope, stageName) {
        if (!scope) {
            return;
        }
        
        const stage = getStageByName(scope.stages, stageName);
        if (!stage) {
            return;
        }
        
        if (scope.stage && typeof(scope.stage.finish) === 'function') {
            scope.stage.finish(scope.model, scope);
        }

        scope.stage = stage;
        scope.stage.available = true;
        
        const nextStageName = getNextStage(scope);
        scope.showPrevious = scope.hasPreviousStage();
        scope.showNext = !!nextStageName;
        scope.showFinish = !nextStageName;
        loadView(scope, scope.stage.view);
        scope.validateStage();
    };
    
    let processWorkflow = function(workflow, workflowInput, stageModels) {
        let workflowModel = workflowInput;
        let stage = workflow.stages[0];
        while (stage) {
            const inputKeys = stage.requireInput || [];
            const input = inputKeys.reduce((input, key) => {
                input[key] = workflowModel[key];
                return input;
            }, {});
            
            if (stage.validateInput && !stage.validateInput(input)) {
                stage.available = false;
                // make remaining stages not available
                break;
            }
            
            const output = stage.process(input, stageModels[stage.name]);
            
            if (!output) {
                // make remaining stages not available
                break;
            }
            
            Object.assign(workflowModel, output);
            stage = getNextStage(workflow, stage, workflowModel);
        }
        
        // build stage roadmap
    };

    $scope.modules = workflowService.getModules();
    $scope.moduleName = '';
    $scope.workflowName = '';
    $scope.stageStack = [];

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
        if (typeof($scope.workflow.start) === 'function') {
            $scope.workflow.start($scope.model, $scope);
        }
        $scope.nextStage();
    };

    $scope.jumpToStage = function(stageName) {
        const stage = getStageByName($scope.stages, stageName);
        if (stage && stage.available) {
            $scope.stageStack.push(stageName);
            setStage($scope, stageName);
        }
    };
    
    $scope.hasPreviousStage = function() {
        return $scope.stageStack.length > 1;
    };

    $scope.previousStage = function() {
        if (!$scope.hasPreviousStage()) {
            return;
        }
        $scope.stageStack.pop();
        setStage($scope, $scope.stageStack[$scope.stageStack.length - 1]);
    };

    $scope.nextStage = function() {
        const nextStageName = getNextStage($scope);
        if (!nextStageName) {
            $scope.finish();
        }
        else {
            $scope.stageStack.push(nextStageName);
            setStage($scope, nextStageName);
        }
    };

    $scope.finish = function() {
        $scope.workflow.finish($scope.model, $scope);
        $scope.$emit('closeModal');
        $scope.$root.$broadcast('reloadGUI');
    };

    $scope.$on('nextStage', $scope.nextStage);

    $scope.$on('startSubflow', (e, workflow) => {
        $scope.model[workflow.model] = {};
        $scope.stages = buildStages(workflow);
        $scope.nextStage();
    });
});
