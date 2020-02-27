ngapp.controller('workflowModalController', function($scope, workflowService) {
    class StageRoadmapEntry {
        constructor(stage, workflow) {
            this._stageStates = {
                unknown: -1,
                complete: 0,
                incomplete: 1,
                unavailable: 2
            };

            this.stage = stage;
            this.workflow = workflow;
            this._state = this._stageStates.unknown;
        }

        isComplete() { return this._state === this._stageStates.complete; }
        isIncomplete() { return this._state === this._stageStates.incomplete; }
        isAvailable() { return this.isComplete() || this.isIncomplete(); }
        setComplete() { this._state = this._stageStates.complete; }
        setIncomplete() { this._state = this._stageStates.incomplete; }
        setUnavailable() { this._state = this._stageStates.unavailable; }
    };

    let getViewFromStage = function(stage) {
        if (stage && stage.view) {
            return {
                name: stage.view,
                ...workflowService.getView(stage.view)
            };
        }
    };

    let isRoadmapComplete = function(stageRoadmap) {
        return stageRoadmap.every(stage => stage.isComplete());
    };
    
    let getNextStage = function(workflow, currentStageName, workflowModel, foundCurrentStage = false) {
        let nextStage;
        let nextStageWorkflow;
        for (const stage of workflow.stages) {
            if (!stage || (stage.shouldInclude && !stage.shouldInclude(workflowModel))) {
                continue;
            }
            if (stage.subflow) {
                // recurse into subflow
                const subflow = workflowService.getWorkflow(stage.subflow);
                if (subflow) {
                    ({foundCurrentStage, nextStage, nextStageWorkflow} = getNextStage(subflow, currentStageName, workflowModel, foundCurrentStage));
                }
            }
            else if (!currentStageName || foundCurrentStage) {
                nextStage = stage;
                nextStageWorkflow = workflow;
            }
            else if (!foundCurrentStage) {
                foundCurrentStage = currentStageName === stage.name;
            }
            if (nextStage) {
                break;
            }
        }
        return {foundCurrentStage, nextStage, nextStageWorkflow};
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
            const {nextStage: stage, nextStageWorkflow: stageWorkflow} = getNextStage(workflow, stageName, workflowModel);
            if (!stage) {
                // all stages of workflow are complete
                break;
            }

            stageName = stage.name;
            const stageView = getViewFromStage(stage);
            if (!stageView || !stageView.process) {
                console.error(`Could not get valid view from stage ${stageName}`);
                continue;
            }

            let stageRoadmapEntry = new StageRoadmapEntry(stage, stageWorkflow);
            stageRoadmap.push(stageRoadmapEntry);

            const stageInput = getInputForStage(stage, workflowModel);

            if (stageName === currentStageName) {
                angular.copy(stageInput, currentStageInput);
            }

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

        if (!newRoadmap.every(({stage}, index) => stage.name === oldRoadmap[index].stage.name)) {
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
        const currentStageIndex = $scope.stageRoadmap.findIndex(({stage}) => stage.name === $scope.currentStageName);
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

    $scope.setStage = function(stage) {
        const stageName = stage ? stage.name : '';
        $scope.currentStageName = stageName;
        $scope.view = getViewFromStage(stage);
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
        $scope.setStage($scope.stageRoadmap.length > 0 ? $scope.stageRoadmap[0].stage : '');
    };

    $scope.advanceStageInDirection = function(direction) {
        const currentStageIndex = $scope.stageRoadmap.findIndex(({stage}) => stage.name === $scope.currentStageName);
        const nextRoadmapEntry = $scope.stageRoadmap[currentStageIndex + direction];
        if (nextRoadmapEntry && nextRoadmapEntry.isAvailable()) {
            $scope.setStage(nextRoadmapEntry.stage);
        }
    };

    $scope.previousStage = function() {
        $scope.advanceStageInDirection(-1);
    };

    $scope.nextStage = function() {
        $scope.advanceStageInDirection(1);
    };

    $scope.finish = function() {
        // TODO: finish on all workflows
        $scope.workflow.finish($scope.workflowModel, $scope);
        $scope.$emit('closeModal');
        $scope.$root.$broadcast('reloadGUI');
    };

    $scope.$watch('model', $scope.processWorkflow, true);

    $scope.$on('nextStage', $scope.nextStage);
});
