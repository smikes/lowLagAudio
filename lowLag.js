if (!window.console) console = {log: function() {}};

var lowLag = new function(){
    var Y;

	this.someVariable = undefined;
	this.showNeedInit = function(){ lowLag.msg("lowLag: you must call lowLag.init() first!"); }

	this.load = this.showNeedInit;
	this.play = this.showNeedInit;

	this.audioTagTimeToLive = 5000;

	this.sm2url = 'sm2/swf/';

	this.soundUrl = "";

	this.debug = "console";

    function maybe(x) {
        if (x) {
            return x;
        } else {
            return { remove: function() {} };
        }
    }


	this.init = function(config){
          Y = config.Y;  
		var force = undefined;
		if(config != undefined){
			if(config['force'] != undefined){
				force = config['force'];
			} 
			if(config['audioTagTimeToLive'] != undefined){
				lowLag.audioTagTimeToLive = config['audioTagTimeToLive'];
			} 
			if(config['sm2url'] != undefined){
				lowLag.sm2url = config['sm2url'];
			} 
			if(config['urlPrefix'] != undefined){
				lowLag.soundUrl = config['urlPrefix'];
			} 
			if(config['debug'] != undefined){
				lowLag.debug = config['debug'];
			} 

		}

		var format = "sm2";
		if(force != undefined) format = force;
		else {
			if(typeof(webkitAudioContext) != "undefined") {
                            format = 'webkitAudio';
                        }
			else if(navigator.userAgent.indexOf("Firefox")!=-1) {
                            format = 'audioTag';
                        }
		}
		switch(format){
			case 'webkitAudio':

				this.msg("init webkitAudio");
				this.load= this.loadSoundWebkitAudio;
				this.play = this.playSoundWebkitAudio;
				this.webkitAudioContext = new webkitAudioContext();
			break;
			case 'audioTag':
				this.msg("init audioTag");

		    maybe(Y.one("#lowLag")).remove();
		    Y.one("body").append("<div id='lowLag'></div>");
				this.load= this.loadSoundAudioTag;
				this.play = this.playSoundAudioTag;
			break;

			case 'sm2':
				this.msg("init SoundManager2");

				this.load = this.loadSoundSM2;
				this.play = this.playSoundSM2;
				lowLag.msg("loading SM2 from "+lowLag.sm2url);

                    Y.use('sm2', function(Y) {
			window.soundManager.setup({ url: lowLag.sm2url, useHighPerformance:true, 
					         onready:lowLag.sm2Ready , debugMode: false});
                        });

                        // TODO(SOM) 2013-Nov-10 only load soundmanager script if needed here


			break;

		}		


	}
	this.sm2IsReady = false;
//sm2 has a callback that tells us when it's ready, so we may need to store
//requests to loadsound, and then call sm2 once it has told us it is set.
	this.sm2ToLoad = [];

	this.loadSoundSM2 = function(url,tag){
		if(lowLag.sm2IsReady){
			lowLag.loadSoundSM2ForReals(url,tag);
		} else {
			lowLag.sm2ToLoad.push([url,tag]);
		}
	}

	this.loadSoundSM2ForReals = function(urls,ptag){
		var tag = lowLag.getTagFromURL(urls,ptag);
		lowLag.msg('sm2 loading '+urls+' as tag ' + tag);
		var urls = lowLag.getURLArray(urls); //coerce
		for(var i = 0; i < urls.length; i++){
			var url = lowLag.soundUrl + urls[i];
			urls[i] = url;
		}

		soundManager.createSound({
      			id: tag,
			autoLoad: true, 
		      url: urls
   		 });
	};

	this.sm2Ready = function(){
		lowLag.sm2IsReady = true;
		for(var i = 0 ; i < lowLag.sm2ToLoad.length; i++){
			var urlAndTag = lowLag.sm2ToLoad[i];
			lowLag.loadSoundSM2ForReals(urlAndTag[0],urlAndTag[1]);
		}
		lowLag.sm2ToLoad = [];
	}

	this.playSoundSM2 = function(tag){
		lowLag.msg("playSoundSM2 "+tag);

		soundManager.play(tag);
	}

	






//we'll use the tag they hand us, or else the url as the tag if it's a single tag,
//or the first url 
	this.getTagFromURL = function(url,tag){
		if(tag != undefined) return tag;
		return lowLag.getSingleURL(url);
	}
	this.getSingleURL = function(urls){
		if(typeof(urls) == "string") return urls;
		return urls[0];
	}
//coerce to be an array
	this.getURLArray = function(urls){
		if(typeof(urls) == "string") return [urls];
		return urls;
	}






	this.webkitAudioContext = undefined;
	this.webkitAudioBuffers = {};

	this.loadSoundWebkitAudio = function(urls,tag){
		var url = lowLag.getSingleURL(urls);
		var tag = lowLag.getTagFromURL (urls,tag);
lowLag.msg('webkitAudio loading '+url+' as tag ' + tag);
		var request = new XMLHttpRequest();
		request.open('GET', lowLag.soundUrl + url, true);
		request.responseType = 'arraybuffer';

		// Decode asynchronously
		request.onload = function() {
		    lowLag.webkitAudioContext.decodeAudioData(request.response, function(buffer) {
				lowLag.webkitAudioBuffers[tag] = buffer;
			}, lowLag.errorLoadWebkitAudtioFile);
		};
		request.send();
	}

	this.errorLoadWebkitAudtioFile = function(e){
		lowLag.msg("Error loading webkitAudio: "+e);
	}

	this.playSoundWebkitAudio= function(tag){
		lowLag.msg("playSoundWebkitAudio "+tag);
		var buffer = lowLag.webkitAudioBuffers[tag];
		var context = lowLag.webkitAudioContext;
		var source = context.createBufferSource(); // creates a sound source
		source.buffer = buffer;                    // tell the source which sound to play
		source.connect(context.destination);       // connect the source to the context's destination (the speakers)
		source.noteOn(0);                          // play the source now
	}












	this.audioTagID = 0;
	this.audioTagNameToElement = {};

	this.loadSoundAudioTag = function(urls,tag){
		var id = "lowLagElem_"+lowLag.audioTagID++;

		var tag = lowLag.getTagFromURL(urls,tag);
		
		var urls = lowLag.getURLArray(urls);


		lowLag.audioTagNameToElement[tag] = id;

lowLag.msg('audioTag loading '+urls+' as tag ' + tag);

		var buf = "";
		buf += '<audio id="'+id+'" preload="auto" autobuffer>';

		for(var i = 0; i < urls.length; i++){
			var url = urls[i];
			var type = "audio/"+lowLag.getExtension(url);

			buf += '  <source src="'+lowLag.soundUrl+url+'" type="'+type+'" />';
		}
		buf += '</audio>';
                Y.one("#lowLag").append(buf);
	}

	this.playSoundAudioTag = function(tag){
		lowLag.msg("playSoundAudioTag "+tag);

		var modelId = lowLag.audioTagNameToElement[tag];

            
            var audioID='#lowLagElem_'+modelId; 
            lowLag.msg( "playing sound with ID: " + modelId  );
            document.getElementById(modelId).play();

	}


	this.getExtension = function(url){
		return url.substring(url.lastIndexOf(".")+1).toLowerCase();

	}


	this.msg = function(m){
		m = "-- lowLag "+m;
		if(lowLag.debug == 'both' || lowLag.debug == 'console'){
			console.log(m);
		}
		if(lowLag.debug == 'both' || lowLag.debug == 'screen'){
			Y.one('#lowLag').append(m+"<br>");
		}
	}




}
