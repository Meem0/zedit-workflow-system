ngapp.controller('workflowModalController', function($scope, workflowService) {
    class StageRoadmapEntry {
        constructor(name) {
            this._stageStates = {
                unknown: -1,
                complete: 0,
                incomplete: 1,
                unavailable: 2
            };

            this.name = name;
            this._state = this._stageStates.unknown;
        }

        isComplete() { return this._state === this._stageStates.complete; }
        isIncomplete() { return this._state === this._stageStates.incomplete; }
        isAvailable() { return this.isComplete() || this.isIncomplete(); }
        setComplete() { this._state = this._stageStates.complete; }
        setIncomplete() { this._state = this._stageStates.incomplete; }
        setUnavailable() { this._state = this._stageStates.unavailable; }
    };

    let getStage = function(workflow, stageName) {
        if (workflow && workflow.stages) {
            return workflow.stages.find(({name}) => name === stageName);
        }
    };

    let getViewFromStage = function(stage) {
        if (stage && stage.view) {
            return {
                name: stage.view,
                ...workflowService.getView(stage.view)
            };
        }
    };

    let getViewFromStageName = function(workflow, stageName) {
        const stage = getStage(workflow, stageName);
        return getViewFromStage(stage);
    };

    let isRoadmapComplete = function(stageRoadmap) {
        return stageRoadmap.every(stage => stage.isComplete());
    };

    let getNextStage = function(workflow, currentStageName, workflowModel) {
        if (workflow && workflow.stages) {
            let nextStageIndex = 0;
            if (currentStageName) {
                const currentStageIndex = workflow.stages.findIndex(({name}) => name === currentStageName);
                nextStageIndex = currentStageIndex + 1;
            }
            for (; nextStageIndex < workflow.stages.length; ++nextStageIndex) {
                const stage = workflow.stages[nextStageIndex];
                if (stage && (!stage.shouldInclude || stage.shouldInclude(workflowModel)) {
                    return stage.name;
                }
            }
        }
        return '';
    };

    let getInputForStage = function(stage, workflowModel) {
        const stageInput = stage && stage.input ? stage.input : {};

        const stageView = getViewFromStage(stage);
        const inputKeys = stageView && stageView.requireInput ? stageView.requireInput : [];
        const modelInput = inputKeys.reduce((input, key) => {
            input[key] = workflowModel[key];
            return input;
        }, {});

        return Object.assign({}, stageInput, modelInput);
    };

    let processStages = function(workflow, workflowInput, stageModels, currentStageName) {
        let stageName = '';
        let workflowModel = {...workflowInput};
        let currentStageInput = {};
        let stageRoadmap = [];
        while (true) {
            stageName = getNextStage(workflow, stageName, workflowModel);
            if (!stageName) {
                // all stages of workflow are complete
                break;
            }

            const stage = getStage(workflow, stageName);
            const stageView = getViewFromStage(stage);
            if (!stage || !stageView || !stageView.process) {
                console.error(`Could not get valid view from stage ${stageName}`);
                continue;
            }

            if (stageName === currentStageName) {
                angular.copy(workflowModel, currentStageInput);
            }

            let stageRoadmapEntry = new StageRoadmapEntry(stageName);
            stageRoadmap.push(stageRoadmapEntry);

            const stageInput = getInputForStage(stage, workflowModel);

            let stageModel = stageModels[stageName];
            if (!stageModel) {
                stageModel = {};
                stageModels[stageName] = stageModel;
            }
            
            const stageOutput = stageView.process(stageInput, stageModel);
            if (!stageOutput) {
                // a stage of the workflow is incomplete; stop processing the workflow
                stageRoadmapEntry.setIncomplete();
                break;
            }
            
            stageRoadmapEntry.setComplete();
            Object.assign(workflowModel, stageOutput);
        }

        return {
            stageRoadmap,
            currentStageInput,
            workflowModel
        };
    };

    let addUnavailableRoadmapEntries = function(newRoadmap, oldRoadmap) {
        if (newRoadmap.length >= oldRoadmap.length) {
            return newRoadmap;
        }

        if (!newRoadmap.every(({name}, index) => name === oldRoadmap[index].name)) {
            return newRoadmap;
        }

        let additionalRoadmapEntries = oldRoadmap.slice(newRoadmap.length);
        additionalRoadmapEntries.forEach(roadmapEntry => roadmapEntry.setUnavailable());

        return newRoadmap.concat(additionalRoadmapEntries);
    };

    let processWorkflow = function(workflow, workflowInput, stageModels, previousStageRoadmap, currentStageName) {
        let {stageRoadmap, currentStageInput, workflowModel} = processStages(workflow, workflowInput, stageModels, currentStageName);
        
        // e.g. workflow has 5 stages, stage 3 is incomplete
        //  if the previousStageRoadmap had stages after 3, we want those appended to the roadmap
        //  in an "unavailable" state; this makes it so that if we go back to a previous stage,
        //  and change something that causes the stage to be incomplete, we don't remove the future
        //  stages from the roadmap
        if (!isRoadmapComplete(stageRoadmap)) {
            stageRoadmap = addUnavailableRoadmapEntries(stageRoadmap, previousStageRoadmap);
        }

        return {stageRoadmap, currentStageInput, workflowModel};
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

    $scope.updateNavigation = function() {
        const currentStageIndex = $scope.stageRoadmap.findIndex(({name}) => name === $scope.currentStageName);
        if (currentStageIndex < 0) {
            return;
        }

        const nextStage = $scope.stageRoadmap[currentStageIndex + 1];
        
        $scope.canNavigatePrevious = currentStageIndex > 0;
        $scope.canNavigateNext = nextStage && nextStage.isAvailable();
        $scope.canFinishWorkflow = isRoadmapComplete($scope.stageRoadmap);
    };

    $scope.processWorkflow = function() {
        if (!$scope.workflow || !$scope.workflowInput || !$scope.stageModels || !$scope.stageRoadmap) {
            return;
        }

        const {stageRoadmap, currentStageInput, workflowModel} = processWorkflow(
            $scope.workflow,
            $scope.workflowInput,
            $scope.stageModels,
            $scope.stageRoadmap,
            $scope.currentStageName
        );
        $scope.stageRoadmap = stageRoadmap;
        // TODO: stage input only needs to be updated when previous stage outputs change
        $scope.input = currentStageInput;
        $scope.workflowModel = workflowModel;

        $scope.updateNavigation();
    };

    $scope.setStage = function(stageName) {
        const stageRoadmapEntry = $scope.stageRoadmap.find(({name}) => name === stageName);
        if (!stageRoadmapEntry || !stageRoadmapEntry.isAvailable()) {
            return;
        }

        $scope.currentStageName = stageName;
        $scope.view = getViewFromStageName($scope.workflow, stageName);
        if (!$scope.stageModels[stageName]) {
            $scope.stageModels[stageName] = {};
        }
        $scope.model = $scope.stageModels[stageName];

        $scope.updateNavigation();
    };

    $scope.selectWorkflow = function(workflow) {
        debugger;
        $scope.workflowName = workflow.name;
        $scope.workflow = workflow;
        $scope.stageModels = {};
        $scope.stageRoadmap = [];
        // TODO: workflow input
        $scope.workflowInput = workflow.start ? workflow.start({}, $scope) : {};
        $scope.processWorkflow();
        $scope.setStage($scope.stageRoadmap.length > 0 ? $scope.stageRoadmap[0].name : '');
    };

    $scope.previousStage = function() {
        const currentStageIndex = $scope.stageRoadmap.findIndex(({name}) => name === $scope.currentStageName);
        const previousStage = $scope.stageRoadmap[currentStageIndex - 1];
        if (previousStage) {
            $scope.setStage(previousStage.name);
        }
    };

    $scope.nextStage = function() {
        const currentStageIndex = $scope.stageRoadmap.findIndex(({name}) => name === $scope.currentStageName);
        const nextStage = $scope.stageRoadmap[currentStageIndex + 1];
        if (nextStage && nextStage.isAvailable()) {
            $scope.setStage(nextStage.name);
        }
    };

    $scope.finish = function() {
        $scope.workflow.finish($scope.workflowModel, $scope);
        $scope.$emit('closeModal');
        $scope.$root.$broadcast('reloadGUI');
    };

    $scope.$watch('model', $scope.processWorkflow, true);

    $scope.$on('nextStage', $scope.nextStage);
});
