export class RequestService {
  static libraryFetch(libraryURLs, mode = 'website') {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();

      let requestMethod;
      let requestURL;
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
      let requestData = {};
      if (libraryURLs) {
        requestData = {
          libraries: libraryURLs
        };
      }

      request.onload = () => {
        if (request.status === 200) {
          const responseData = JSON.parse(request.response);
          switch (mode) {
            case 'website':
              const libraryMap = {};
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
}
