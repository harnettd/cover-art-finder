export const handleError = (error) => {
    if (error.response) {
      console.log("response error");
      console.log(error.response.status);
      console.log(error.response.headers);
      console.log(error.response.data);
    } else if (error.request) {
      console.log("request error");
      console.log(error.request);
    } else {
      console.log("other error");
      console.log(error.message);
    }
    console.log(error.config);
  };