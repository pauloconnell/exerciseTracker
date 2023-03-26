// this funciton inputs the user id then sets form action to hit reports API for that user

function setAPIroute(input) {
  console.log("input got ", input, input.value);
  let api = "/api/exercise/log?userId=" + input.value;
  document.queryselector(".getLog").setAttribute("action", api);
}
