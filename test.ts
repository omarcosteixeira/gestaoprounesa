import Sib from "sib-api-v3-sdk";
console.log(Sib.ApiClient ? "HAS_API_CLIENT" : "NO_API_CLIENT");
console.log(Object.keys(Sib).slice(0, 10));
