import path from "wun:path";

console.log(path.basename(""));
console.log(path.basename("/hello/world"));
console.log(path.basename("////hello//world//"));
console.log(path.basename("a/b/c/d///e"));

console.log(path.dirname(""));
console.log(path.dirname("test"));
console.log(path.dirname("/test"));
console.log(path.dirname("/hello/world"));
console.log(path.dirname("////hello//world//"));
console.log(path.dirname("a/b/c/d///e"));
