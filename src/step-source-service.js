import _ from 'underscore';

import { RequestService } from './request-service';
import { Step } from './step';

const BITRISE_STEPLIB_URL = 'https://github.com/bitrise-io/bitrise-steplib.git';

export class StepSourceService {
  constructor(defaultLibraryURL = BITRISE_STEPLIB_URL, libraries = [], localSteps = [], gitSteps = []) {
    this.defaultLibraryURL = defaultLibraryURL;
    this.libraries = libraries;
    this.localSteps = localSteps;
    this.gitSteps = gitSteps;
  }

  loadDefaultLibrary() {
    return this.loadLibrariesWithURLs([this.defaultLibraryURL]);
  }

  loadLibrariesWithURLs(libraryURLs = []) {
    return new Promise((resolve, reject) => {
      const notLoadedLibraryURLs = _.reject(_.uniq(libraryURLs.concat(this.defaultLibraryURL)), aLibraryURL => {
        return _.find(this.libraries, {
          url: aLibraryURL
        });
      });

      if (notLoadedLibraryURLs.length == 0) {
        resolve();

        return;
      }

      return RequestService.libraryFetch(notLoadedLibraryURLs).then(
        data => {
          _.each(data, (aLibraryData, aLibraryURL) => {
            try {
              const library = {
                url: aLibraryURL
              };

              const stepIDs = _.keys(aLibraryData.steps).sort();

              library.steps = {};
              library.latestStepVersions = {};
              library.deprecatedSteps = [];
              _.each(stepIDs, aStepID => {
                library.steps[aStepID] = {};
                library.latestStepVersions[aStepID] = aLibraryData.steps[aStepID].latest_version_number;
                library.steps[aStepID] = _.mapObject(aLibraryData.steps[aStepID].versions, (aStepConfig, version) => {
                  const cvs = aStepID + '@' + version;

                  const step = this.stepFromCVS(cvs);
                  step.defaultStepConfig = aStepConfig;

                  return step;
                });

                if (
                  aLibraryData.steps[aStepID].info !== undefined &&
                  aLibraryData.steps[aStepID].info.deprecate_notes !== undefined
                ) {
                  _.each(library.steps[aStepID], function(aStep) {
                    library.deprecatedSteps.push(aStep);
                  });
                }
              });

              this.libraries.push(library);

              resolve();
            } catch (error) {
              console.log(error.message);
              reject(new Error('Error loading library.'));
            }
          });
        },
        function(error) {
          reject(error);
        }
      );
    });
  }

  stepFromCVS(cvs) {
    const step = new Step(cvs);

    const idStartIndex = cvs.indexOf('::') != -1 ? cvs.indexOf('::') + 2 : 0;
    const versionStartIndex =
      cvs.lastIndexOf('@') != -1 && cvs.indexOf('::') < cvs.lastIndexOf('@') ? cvs.lastIndexOf('@') + 1 : -1;

    const source =
      idStartIndex > 0 && cvs.slice(0, idStartIndex - 2).length > 0 ? cvs.slice(0, idStartIndex - 2) : null;
    const id = cvs.slice(idStartIndex, versionStartIndex != -1 ? versionStartIndex - 1 : undefined);
    const version = versionStartIndex != -1 && versionStartIndex != cvs.length ? cvs.slice(versionStartIndex) : null;

    switch (source) {
      case 'path':
        if (id.length == 0) {
          throw new Error('Path not specified.');
        }

        step.localPath = id;

        const localStep = _.find(this.localSteps, {
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

        const gitStep = _.find(this.gitSteps, {
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

        const library = _.find(this.libraries, {
          url: step.libraryURL
        });

        if (!library) {
          break;
        }

        if (!library.steps[step.id]) {
          throw new Error(`Step with ID not found in library: ${step.id}`);
        }

        const requestedVersion = step.version ? step.version : library.latestStepVersions[step.id];

        if (!library.steps[step.id][requestedVersion]) {
          throw new Error(`Step with version not found in library: ${requestedVersion}`);
        }

        step.version = requestedVersion;
        step.defaultStepConfig = library.steps[step.id][requestedVersion].defaultStepConfig;
    }

    return step;
  }

  versionsOfStep(step) {
    if (step.libraryURL !== undefined) {
      const library = _.find(this.libraries, {
        url: step.libraryURL
      });

      return _.sortBy(_.keys(library.steps[step.id]), function(version) {
        return _.map(version.split('.'), function(aVersionPart) {
          const pad = '000000';
          const versionPartWithLeadingZeros = pad.substring(0, pad.length - aVersionPart.length) + aVersionPart;

          return versionPartWithLeadingZeros;
        }).join('.');
      }).reverse();
    } else if (step.localPath !== undefined) {
      return undefined;
    } else if (step.gitURL !== undefined) {
      return [step.version];
    }
  }

  isLatestStepVersion(step) {
    if (step.libraryURL !== undefined) {
      const library = _.find(this.libraries, {
        url: step.libraryURL
      });

      return step.version === null || step.version == library.latestStepVersions[step.id];
    } else if (step.localPath !== undefined) {
      return undefined;
    } else if (step.gitURL !== undefined) {
      return true;
    }
  }

  isStepAtLeastOnVersion(step, version) {
    const versions = this.versionsOfStep(step);

    return versions.indexOf(step.version) <= versions.indexOf(version);
  }
}
