ngapp.service('workflowService', function() {
    let modules = {},
        workflows = {},
        views = {};

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
                ...views[stage.view]
            };
        }
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
                const subflow = workflows[stage.subflow];
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

    this.processWorkflow = function(workflow, workflowInput, stageModels) {
        let stageName = '';
        let workflowModel = {...workflowInput};
        let stageInputs = {};
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

            stageInputs[stageName] = angular.copy(stageInput);

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
            stageInputs,
            workflowModel
        };
    };

    this.addModule = function({name, ...module}) {
        modules[name] = {name: name, ...module};
    };

    this.getModules = () => modules;

    this.addWorkflow = function({name, ...workflow}) {
        workflows[name] = {name: name, ...workflow};
    };

    this.getWorkflow = name => workflows[name];

    this.addView = function(name, view) {
        views[name] = view;
    };

    this.getView = name => views[name];
});