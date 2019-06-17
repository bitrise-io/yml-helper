(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.YmlHelper = {}));
}(this, function (exports) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  var _ = require('underscore');

  var Step =
  /*#__PURE__*/
  function () {
    function Step(cvs, userStepConfig, defaultStepConfig) {
      _classCallCheck(this, Step);

      this.cvs = cvs;
      this.localPath;
      this.gitURL;
      this.libraryURL;
      this.id;
      this.version;
      this.userStepConfig = userStepConfig;

      if (!this.userStepConfig) {
        this.userStepConfig = {};
      }

      this.defaultStepConfig = defaultStepConfig;
    }

    _createClass(Step, null, [{
      key: "cvsFromWrappedStepConfig",
      value: function cvsFromWrappedStepConfig(wrappedStepConfig) {
        return _.first(_.keys(wrappedStepConfig));
      }
    }]);

    return Step;
  }();

  var _$1 = require('underscore');
  var Workflow = function Workflow(id, workflowConfig, stepSourceService) {
    _classCallCheck(this, Workflow);

    this.id = id;
    this.workflowConfig = workflowConfig;

    if (!this.workflowConfig) {
      return;
    }

    this.steps = _$1.map(workflowConfig.steps, function (aWrappedUserStepConfig) {
      var stepCVS = Step.cvsFromWrappedStepConfig(aWrappedUserStepConfig);
      var step;
      var userStepConfig = aWrappedUserStepConfig[stepCVS];

      try {
        step = stepSourceService.stepFromCVS(stepCVS);
        step.userStepConfig = userStepConfig;
      } catch (error) {
        console.log(error.message);
        step = new Step(stepCVS, userStepConfig);
      }

      return step;
    });
  };

  var _$2 = require('underscore');

  var yaml = require('js-yaml');
  var App = function App(bitriseYML, stepSourceService) {
    _classCallCheck(this, App);

    var appConfig = yaml.safeLoad(bitriseYML);
    this.defaultLibraryURL = appConfig.default_step_lib_source;
    this.workflows = _$2.map(appConfig.workflows, function (workflowConfig, workflowID) {
      return new Workflow(workflowID, workflowConfig, stepSourceService);
    });
  };

  var RequestService =
  /*#__PURE__*/
  function () {
    function RequestService() {
      _classCallCheck(this, RequestService);
    }

    _createClass(RequestService, null, [{
      key: "libraryFetch",
      value: function libraryFetch(libraryURLs) {
        var mode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'website';
        return new Promise(function (resolve, reject) {
          var request = new XMLHttpRequest();
          var requestMethod;
          var requestURL;

          switch (mode) {
            case 'website':
              requestMethod = 'get';
              requestURL = 'https://bitrise-steplib-collection.s3.amazonaws.com/spec.json.gz';
              break;

            case 'cli':
              requestMethod = 'post';
              requestURL = '/api/spec';
              break;
          }

          request.open(requestMethod, requestURL);
          request.setRequestHeader('Content-Type', 'application/json');
          var requestData = {};

          if (libraryURLs) {
            requestData = {
              libraries: libraryURLs
            };
          }

          request.onload = function () {
            if (request.status === 200) {
              var responseData = JSON.parse(request.response);

              switch (mode) {
                case 'website':
                  var libraryMap = {};
                  libraryMap[responseData.steplib_source] = responseData;
                  resolve(libraryMap);
                  break;

                case 'cli':
                  resolve(responseData.library_map);
                  break;
              }
            } else {
              reject(new Error('Error loading library.'));
            }
          };

          request.send(JSON.stringify(requestData));
        });
      }
    }]);

    return RequestService;
  }();

  var _$3 = require('underscore');
  var BITRISE_STEPLIB_URL = 'https://github.com/bitrise-io/bitrise-steplib.git';
  var StepSourceService =
  /*#__PURE__*/
  function () {
    function StepSourceService() {
      var defaultLibraryURL = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : BITRISE_STEPLIB_URL;
      var libraries = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var localSteps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      var gitSteps = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

      _classCallCheck(this, StepSourceService);

      this.defaultLibraryURL = defaultLibraryURL;
      this.libraries = libraries;
      this.localSteps = localSteps;
      this.gitSteps = gitSteps;
    }

    _createClass(StepSourceService, [{
      key: "loadDefaultLibrary",
      value: function loadDefaultLibrary() {
        return this.loadLibrariesWithURLs([this.defaultLibraryURL]);
      }
    }, {
      key: "loadLibrariesWithURLs",
      value: function loadLibrariesWithURLs() {
        var _this = this;

        var libraryURLs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
        return new Promise(function (resolve, reject) {
          var notLoadedLibraryURLs = _$3.reject(_$3.uniq(libraryURLs.concat(_this.defaultLibraryURL)), function (aLibraryURL) {
            return _$3.find(_this.libraries, {
              url: aLibraryURL
            });
          });

          if (notLoadedLibraryURLs.length == 0) {
            resolve();
            return;
          }

          return RequestService.libraryFetch(notLoadedLibraryURLs).then(function (data) {
            _$3.each(data, function (aLibraryData, aLibraryURL) {
              try {
                var library = {
                  url: aLibraryURL
                };

                var stepIDs = _$3.keys(aLibraryData.steps).sort();

                library.steps = {};
                library.latestStepVersions = {};
                library.deprecatedSteps = [];

                _$3.each(stepIDs, function (aStepID) {
                  library.steps[aStepID] = {};
                  library.latestStepVersions[aStepID] = aLibraryData.steps[aStepID].latest_version_number;
                  library.steps[aStepID] = _$3.mapObject(aLibraryData.steps[aStepID].versions, function (aStepConfig, version) {
                    var cvs = aStepID + '@' + version;

                    var step = _this.stepFromCVS(cvs);

                    step.defaultStepConfig = aStepConfig;
                    return step;
                  });

                  if (aLibraryData.steps[aStepID].info !== undefined && aLibraryData.steps[aStepID].info.deprecate_notes !== undefined) {
                    _$3.each(library.steps[aStepID], function (aStep) {
                      library.deprecatedSteps.push(aStep);
                    });
                  }
                });

                _this.libraries.push(library);

                resolve();
              } catch (error) {
                console.log(error.message);
                reject(new Error('Error loading library.'));
              }
            });
          }, function (error) {
            reject(error);
          });
        });
      }
    }, {
      key: "stepFromCVS",
      value: function stepFromCVS(cvs) {
        var step = new Step(cvs);
        var idStartIndex = cvs.indexOf('::') != -1 ? cvs.indexOf('::') + 2 : 0;
        var versionStartIndex = cvs.lastIndexOf('@') != -1 && cvs.indexOf('::') < cvs.lastIndexOf('@') ? cvs.lastIndexOf('@') + 1 : -1;
        var source = idStartIndex > 0 && cvs.slice(0, idStartIndex - 2).length > 0 ? cvs.slice(0, idStartIndex - 2) : null;
        var id = cvs.slice(idStartIndex, versionStartIndex != -1 ? versionStartIndex - 1 : undefined);
        var version = versionStartIndex != -1 && versionStartIndex != cvs.length ? cvs.slice(versionStartIndex) : null;

        switch (source) {
          case 'path':
            if (id.length == 0) {
              throw new Error('Path not specified.');
            }

            step.localPath = id;

            var localStep = _$3.find(this.localSteps, {
              localPath: step.localPath
            });

            if (localStep) {
              step.defaultStepConfig = localStep.defaultStepConfig;
            }

            break;

          case 'git':
            if (id.length == 0) {
              throw new Error('Git URL not specified.');
            }

            step.gitURL = id;
            step.version = version;

            var gitStep = _$3.find(this.gitSteps, {
              gitURL: step.gitURL,
              version: step.version
            });

            if (gitStep) {
              step.defaultStepConfig = gitStep.defaultStepConfig;
            }

            break;

          default:
            if (!source && !this.defaultLibraryURL) {
              throw new Error('Step library not specified.');
            }

            if (id.length == 0) {
              throw new Error('Step ID not specified.');
            }

            step.libraryURL = source != null ? source : this.defaultLibraryURL;
            step.id = id;
            step.version = version;

            var library = _$3.find(this.libraries, {
              url: step.libraryURL
            });

            if (!library) {
              break;
            }

            if (!library.steps[step.id]) {
              throw new Error("Step with ID not found in library: ".concat(step.id));
            }

            var requestedVersion = step.version ? step.version : library.latestStepVersions[step.id];

            if (!library.steps[step.id][requestedVersion]) {
              throw new Error("Step with version not found in library: ".concat(requestedVersion));
            }

            step.version = requestedVersion;
            step.defaultStepConfig = library.steps[step.id][requestedVersion].defaultStepConfig;
        }

        return step;
      }
    }, {
      key: "versionsOfStep",
      value: function versionsOfStep(step) {
        if (step.libraryURL !== undefined) {
          var library = _$3.find(this.libraries, {
            url: step.libraryURL
          });

          return _$3.sortBy(_$3.keys(library.steps[step.id]), function (version) {
            return _$3.map(version.split('.'), function (aVersionPart) {
              var pad = '000000';
              var versionPartWithLeadingZeros = pad.substring(0, pad.length - aVersionPart.length) + aVersionPart;
              return versionPartWithLeadingZeros;
            }).join('.');
          }).reverse();
        } else if (step.localPath !== undefined) {
          return undefined;
        } else if (step.gitURL !== undefined) {
          return [step.version];
        }
      }
    }, {
      key: "isLatestStepVersion",
      value: function isLatestStepVersion(step) {
        if (step.libraryURL !== undefined) {
          var library = _$3.find(this.libraries, {
            url: step.libraryURL
          });

          return step.version === null || step.version == library.latestStepVersions[step.id];
        } else if (step.localPath !== undefined) {
          return undefined;
        } else if (step.gitURL !== undefined) {
          return true;
        }
      }
    }, {
      key: "isStepAtLeastOnVersion",
      value: function isStepAtLeastOnVersion(step, version) {
        var versions = this.versionsOfStep(step);
        return versions.indexOf(step.version) <= versions.indexOf(version);
      }
    }]);

    return StepSourceService;
  }();

  exports.App = App;
  exports.Step = Step;
  exports.StepSourceService = StepSourceService;
  exports.Workflow = Workflow;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
