###说明
这个模块主要是Nodejs下一个对fs.wacth封装的模块，使用了递归监听文件目录下的所有子目录，用延迟来处理fs.watch执行两次的问题，同时可以取消监听

####使用
因暂时没有提交到 npm，只需要直接拷贝到对应的node_modules文件夹即可


```js
//加载
var watcher = require('node-watcher');
//构建新对象  fpath 为文件或文件夹路径  fname为返回的文件名
var nwt = new watcher(fpath,function(fname){
    //您的代码
})

