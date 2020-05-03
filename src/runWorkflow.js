ngapp.directive('runWorkflow', function () {
    return {
        restrict: 'E',
        templateUrl: `${modulePath}/partials/runWorkflow.html`,
        controller: 'runWorkflowController',
        scope: {
            workflow: '=',
            selectedNodes: '<'
        }
    };
});

ngapp.controller('runWorkflowController', function ($scope, workflowService) {
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

    let isRoadmapComplete = function(stageRoadmap) {
        return stageRoadmap.every(stage => stage.isComplete());
    };

    let processWorkflow = function(workflow, workflowInput, stageModels, previousStageRoadmap) {
        let {stageRoadmap, workflowModel} = workflowService.processWorkflow(workflow, workflowInput, stageModels);
        
        // e.g. workflow has 5 stages, stage 3 is incomplete
        //  if the previousStageRoadmap had stages after 3, we want those appended to the roadmap
        //  in an "unavailable" state; this makes it so that if we go back to a previous stage,
        //  and change something that causes the stage to be incomplete, we don't remove the future
        //  stages from the roadmap
        if (!isRoadmapComplete(stageRoadmap)) {
            stageRoadmap = addUnavailableRoadmapEntries(stageRoadmap, previousStageRoadmap);
        }

        return {stageRoadmap, workflowModel};
    };

    // scope functions
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

    $scope.updateLoadedViews = function() {
        if (!$scope.loadedViews) {
            $scope.loadedViews = {};
        }

        $scope.stageRoadmap.forEach(stageRoadmapEntry => {
            const stageName = stageRoadmapEntry.stage.name;
            if (!$scope.loadedViews[stageName]) {
                const stageView = workflowService.getView(stageRoadmapEntry.stage.view);
                if (stageView) {
                    $scope.loadedViews[stageName] = {
                        stageName,
                        templateUrl: stageView.templateUrl,
                        controller: stageView.controller
                    };
                }
            }
        });
    };

    $scope.updateStageInput = function(stageName) {
        if (!$scope.stageInputs) {
            $scope.stageInputs = {};
        }
        const stageInput = workflowService.getInputForStage($scope.workflow, $scope.workflowInput, $scope.stageModels, stageName);
        if (!angular.equals($scope.stageInputs[stageName], stageInput)) {
            $scope.stageInputs[stageName] = stageInput;
        }
    };

    $scope.processWorkflow = function() {
        if (!$scope.workflow || !$scope.workflowInput || !$scope.stageModels || !$scope.stageRoadmap) {
            return;
        }

        const {stageRoadmap, workflowModel} = processWorkflow(
            $scope.workflow,
            $scope.workflowInput,
            $scope.stageModels,
            $scope.stageRoadmap
        );
        $scope.stageRoadmap = stageRoadmap;
        $scope.updateLoadedViews();
        $scope.workflowModel = workflowModel;

        $scope.updateNavigation();
    };

    $scope.unwatchModel = function() {
        if ($scope.endWatchModel) {
            $scope.endWatchModel();
            $scope.endWatchModel = undefined;
        }
    };

    $scope.watchModel = function() {
        if (!$scope.endWatchModel) {
            $scope.endWatchModel = $scope.$watch('stageModels', $scope.processWorkflow, true);
        }
    };

    $scope.setStage = function(stage) {
        const stageName = stage ? stage.name : '';
        $scope.currentStageName = stageName;
        $scope.updateStageInput(stageName);
        $scope.updateNavigation();
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

    $scope.$on('nextStage', $scope.nextStage);

    $scope.stageModels = {};
    $scope.stageRoadmap = [];
    // TODO: workflow input
    $scope.workflowInput = $scope.workflow.start ? $scope.workflow.start({}, $scope) : {};
    $scope.processWorkflow();
    $scope.setStage($scope.stageRoadmap.length > 0 ? $scope.stageRoadmap[0].stage : '');
    $scope.watchModel();
});
