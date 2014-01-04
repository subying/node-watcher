/*
依赖模块
 */
var fs = require('fs')
	,path = require('path')
;

/*
	类型判断 Boolean Number String Function Array Date RegExp Object Error
	返回类型名称(小写)
*/
var obj_type={}
	,core_toString=obj_type.toString
	,hasOwn = obj_type.hasOwnProperty
	,type_arr = "Boolean Number String Function Array Date RegExp Object Error".split(" ")
;
for(var i in type_arr){
	obj_type[ "[object " + type_arr[i] + "]" ] = type_arr[i].toLowerCase();
};
oty =	function(obj){
	if ( obj == null ) {
		return String( obj );
	}
	return (typeof obj === "object" || typeof obj === "function")?(obj_type[ core_toString.call(obj) ] || "object") :typeof obj;
}

/*
	判断路径类型 File Directory SymbolicLink （文件、目录、符号链接）
*/
var shortcuts = {
		'file': 'File'
		,'dir': 'Directory'
	}
	,pty = {}
;
Object.keys(shortcuts).forEach(function(key){
	pty[key] = function(fpath){
		var stat = fs.statSync;
		if (fs.existsSync(fpath)) {
			return stat(fpath)['is' + shortcuts[key]]();
		}
		return false;
	}
});

/*
对目录进行递归
*/
var subDir = function(parent, cb) {
  if (pty.dir(parent)) {//如果是目录
    fs.readdir(parent, function(err, all) {//读取目录
      all && all.forEach(function(f) {//遍历目录先的文件和文件夹
        var sdir = path.join(parent, f)
        if (pty.dir(sdir)) {//如果是目录 则返回cb操作  实现递归
          cb.call(null, sdir);
        }
      });
    });
  }
};

/*
对object的操作
*/
var objCmd = {
	add:function(obj,name,value){//增加
		if(obj && name){
			obj[name] = value;
			return true;
		}
		return false;
	}
	,del:function(obj,name){// 删除
		if(obj && name){
			delete obj[name];
		}else if(obj && (name==='all' || !name)){
			obj = {};
		}
	}
	,update:function(obj,name,value){//改  更新
		if(objCmd.has(obj,name)){
			obj[name] = value;
			return true;
		}
		return false;
	}
	,has:function(obj,name){// 查 判断是否存在
		if(obj && name){
			if(obj.hasOwnProperty(name)){
				return true;
			}
			return false;
		}
		return false;
	}
	,exec:function(obj,fnty,name,value){//命令模式
		if(objCmd[fnty] && obj && name){
			objCmd[fnty](obj,name,value);
		}
	}
}

/*
用延时的方法来防止 fs.watch 触发两次（目前 node.js 1.0.2 版未解决触发两次的问题）
*/
var worker = {
	isFree:true //是否空闲
	,done:function(cb){
		worker.busy(function(){
			setTimeout(function(){
				cb();//执行回调方法
				worker.free();//执行完成后调整状态
			},100);
		});
	}
	,free:function(){
		worker.isFree = true;
	}
	,busy:function(cb){
		if(worker.isFree){
			worker.isFree = false;
			cb();
		}
	}
}


/*
监听一个文件或者一个目录
fpath  string  文件或者目录
recursive boolean 配置参数 是否递归监听，即监听目录下的多级子目录  默认为true
callback 回调函数

*/
var watcher = function(fpath,recursive,callback){
	if(fpath==="" || oty(fpath)!='string'){ //如果路径为空或者参数不是字符串则取消执行
		return false;
	}

	if(oty(recursive) === 'function'){ //如果第二参数是function 则 recursive 为默认的true
		callback = recursive;
		recursive = true;
	}

	if(oty(callback) != 'function'){
		callback = new Function;
	}

	//初始化配置
	this.fpath = fpath;
	this.recursive = recursive;
	this.callback = callback;
	this.watcherCache = {};

	//执行初始化方法
	this.init();
};

watcher.prototype = {
	init:function(){//初始化方法
		var _self = this
			,fpath = _self.fpath
			,callback = _self.callback
		;

		_self.watch(fpath,callback); //执行监听
	}
	,watch:function(fpath,callback){ //监听方法
		var _self = this;
		if(pty.file(fpath)){ // 如果是文件路径
			var parent = path.resolve(fpath,'..');//找到它的父级目录
			var fsw = fs.watch(parent,function(event,fname){//监听父级目录而使用过滤文件的方法实现对文件监听
				if(path.basename(fpath) === fname){//过滤文件
					_self.cbcall(fpath,callback);
				}
			})
			.on('error',_self.catchException) //错误处理
			;
			objCmd.exec(_self.watcherCache,'add',fpath,fsw);//记录每个监听对象
		}else if(pty.dir(fpath)){//如果是目录
			var fsw = fs.watch(fpath,function(event,fname){//监听目录
				if(fname){
					_self.cbcall(path.join(fpath, fname),callback);
				}
			})
			.on('error',_self.catchException)//错误处理
			;
			objCmd.exec(_self.watcherCache,'add',fpath,fsw);//记录每个监听对象

			if(_self.recursive){//如果需要递归查询
				subDir(fpath,function(dir){
					_self.watch(dir,callback);
				});
			}
		}
	}
	,catchException:function(){//错误处理方法
	}
	,cbcall:function(fpath,callback){//对回调函数进行处理
		var _self = this;

		worker.done(function(){//处理callback方法执行两次的问题
			callback(fpath);
		});

	}
	,unwatch:function(){//关闭监听
		var _self = this;
		Object.keys(_self.watcherCache).forEach(function(key){//取到缓存区的每一个监听
			_self.watcherCache[key].close();
			delete _self.watcherCache[key];
		});
		_self.watcherCache = {};
	}
};

module.exports = watcher;
