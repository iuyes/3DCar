/**
 * 页面入口函数为init，startGame为开始游戏，restartGame为重新开始游戏
 * 跟随地形的算法是从小车引射线到地面，保证距离固定，颠簸算法是根据转向来的
 * control是render过程中的主要函数
 * 地形的高低起伏从图片数据读取而来，整个地形由9块小地行拼接而来
 */
var
    renderer,
    scene,
    camera,
    container,
    camx = 0,
    camy = 10000,
    camz = 300,
    light,
    SHADOW_MAP_WIDTH = 1024, 
    SHADOW_MAP_HEIGHT = 512,
    sun,
    car,
    cubeMesh,
    carContainer,
    carMesh,
    groundArray = [],
    allLoaded = false,
    loadCount = 0,
    
    delta,
    time,
    oldTime,
    
    steering = 0,
    gameOver = false,
    gameStarted = false,
    canPressRestart = false,
    speed = 0,
    maxspeed = 30,
    angle = 0,
    hm = 0,
    vm = 0,
    friction = 0.08,
    carx = 0,
    carz = 0,
    cary = 520,
    caryto = 520,
    frontleft,
    frontright,
    backleft,
    backright,
    ray = new THREE.Ray(),
    currentNormal = new THREE.Vector3(0,-1,0),
    tempNormal = new THREE.Vector3(0,-1,0),
    lastx = 0,
    lastz = 0,
    star,
    starTaken = false,
    starCount = 0,
    lastTimeUpdate,
    soundOn = true,
    sourceNode;
            
    
ray.direction = new THREE.Vector3(0, -1, 0);

function showResult() {
    var resultbox = document.getElementById("resultbox");  
    resultbox.innerHTML = "<h3>游戏结束!</h3>";

    var numStars = starCount;
    if (numStars < 10) numStars = "0"+numStars;

    resultbox.innerHTML += "<img src='img/star.png' width='24' height='22'> x <h20>"+numStars+"</h20><p>按任意键继续!</p>";
    resultbox.style.display = "block";  
    resultbox.style.marginLeft = "-" + parseInt(resultbox.offsetWidth / 2) + "px";
    resultbox.style.marginTop = "-" + parseInt(resultbox.offsetHeight / 2) + "px";
    
    gameOver = true;
    canPressRestart = false;

    setTimeout(setCanRestart, 1500);
}
            
function showInstruction(loadingComplete) {
    var instructionbox = document.getElementById("instructionbox");  
    if (loadingComplete) {
        instructionbox.innerHTML = "<h3>按任意键开始游戏!</h3>";
    } else {
        instructionbox.innerHTML = "<h3>载入中...</h3>";
    }
    instructionbox.innerHTML += "<img src='img/arrowkeys.png'><p>方向键控制驾驶.</p><p>规定时间内收集尽可能多的星星</p>";
    instructionbox.style.display = "block"; 
    instructionbox.style.marginLeft = "-" + parseInt(instructionbox.offsetWidth / 2) + "px";
    instructionbox.style.marginTop = "-" + parseInt(instructionbox.offsetHeight / 2) + "px";
}

function setCanRestart () {
    canPressRestart = true;
}

function hideResult () {

    var resultbox = document.getElementById("resultbox"); 
    resultbox.style.display = "none";
}
function hideInstruction () {
    var instructionbox = document.getElementById("instructionbox"); 
    instructionbox.style.display = "none";
}
            
function onDocumentMousedown( event ) {
    event.preventDefault();
}
            
function initRenderer() {
    container = document.getElementById("view-port");
    // renderer
    renderer = new THREE.WebGLRenderer({antialias: false});
    renderer.setClearColor( 0x5e8188, 1 );
    renderer.setSize( container.clientWidth, container.clientHeight );

    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.autoClear = false;

    container.appendChild( renderer.domElement );
}

function initScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x5e8188, 6000, 8000 );
}

function initCamera() {
    camera = new THREE.PerspectiveCamera( 60, container.clientWidth / container.clientHeight, 1, 100000 );
    camera.position.z = camz;
    camera.position.y = camy;
    camera.lookAt(new THREE.Vector3(0,0,0));
    scene.add( camera );
}

function getHeightData(img) {
    var canvas = document.createElement( 'canvas' );
    canvas.width = 64;
    canvas.height = 64;
    var context = canvas.getContext( '2d' );

    var size = 64 * 64, data = new Float32Array( size );

    context.drawImage(img,0,0);

    for ( var i = 0; i < size; i ++ ) {
        data[i] = 0
    }

    var imgd = context.getImageData(0, 0, 64, 64);
    var pix = imgd.data;

    var j=0;
    for (var i = 0, n = pix.length; i < n; i += (4)) {
        var all = pix[i]+pix[i+1]+pix[i+2];
        data[j++] = all*5;
    }

    return data;

}

function createTexture() {

    var texture = document.createElement( 'canvas' );
    texture.width = 256;
    texture.height = 256;
    var contextTexture = texture.getContext( '2d' );
    // bg
    contextTexture.fillStyle = "rgb(222, 172, 109)";
    contextTexture.fillRect(0, 0, 256, 256);

    return texture;
}
            
function initGround() {
    //terrain
    var img = new Image();
    img.onload = function () {
       var data = getHeightData(img);

        // plane
        var planeGeometry = new THREE.PlaneGeometry( 5000, 5000, 63, 63 );
        
        var x = 0
        var y = 0;
        for ( var i = 0, l = planeGeometry.vertices.length; i < l; i++ ) {
            if (i%65 == 64) ++y;
            x = i-(y*64);
            var dat = data[i];
            planeGeometry.vertices[i].z = dat/4;
        }

        planeGeometry.computeCentroids();
        planeGeometry.computeTangents();
        planeGeometry.computeFaceNormals();
        planeGeometry.computeVertexNormals();

        //场景有九块方格拼接起来
        for (var z=0; z<3; ++z ) {
            groundArray[z] = [];
            for (var x=0; x<3; ++x ) {
                var texture = new THREE.Texture( createTexture() );
                texture.needsUpdate = true;
                texture.minFilter = THREE.NearestMipMapNearestFilter;
                texture.magFilter = THREE.NearestMipMapNearestFilter;

                var planeMaterial = new THREE.MeshLambertMaterial( {color: 0xffffff, map: texture, shading: THREE.SmoothShading} );

                var ground = new THREE.Mesh(planeGeometry, planeMaterial);
                ground.rotation.x = -Math.PI/2;
                ground.position.x = ((x-1)*5000);
                ground.position.z = ((z-1)*5000);

                ground.castShadow = false;
                ground.receiveShadow = true;
                scene.add( ground );
                groundArray[z].push(ground);
                
                //将地面加入碰撞检测队列
                THREE.Collisions.colliders.push( THREE.CollisionUtils.MeshColliderWBox(ground) );
            }
        }
    };

    img.src = "img/hm.png";
}

function initLight() {
    var ambient = new THREE.AmbientLight( 0x999999 );
    scene.add( ambient );

    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.3 );
    directionalLight.position.x = 0;
    directionalLight.position.y = 0.1;
    directionalLight.position.z = -1;
    directionalLight.position.normalize();
    scene.add( directionalLight );
    
    light = new THREE.SpotLight( 0xaaaaaa );

    light.castShadow = true;

    light.shadowCameraNear = 1;
    light.shadowCameraFar = camera.far;
    light.shadowCameraFov = 40;

    light.shadowBias = 0.00001;
    light.shadowDarkness = 0.75;

    light.shadowMapWidth = SHADOW_MAP_WIDTH;
    light.shadowMapHeight = SHADOW_MAP_HEIGHT;

    scene.add( light );
}

function initSun() {
    sun  = new THREE.Sprite( new THREE.SpriteMaterial({ map: THREE.ImageUtils.loadTexture( "img/sun.png") , useScreenCoordinates: false, color: 0xffffff, blending: THREE.AdditiveBlending }) );
    sun.scale.set( 9, 9, 9 );
    scene.add(sun);
}

function initSky() {
    var skyMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, fog: false, map: THREE.ImageUtils.loadTexture( "img/sky.png"), shading: THREE.FlatShading} );
    var skySphere = new THREE.SphereGeometry( 40000, 20, 10 );
    sky = new THREE.Mesh(skySphere, skyMaterial);
    sky.flipSided = true;
    sky.position.y = 4000;
    sky.scale.y = 0.10;
    scene.add(sky);
}

function loadingDone () {
    showInstruction(allLoaded);
    document.addEventListener( 'keydown', keyD, false );
    document.addEventListener( 'keyup', keyU, false );
}
            
function checkLoaded () {
    ++loadCount;

    if (loadCount >= 4) {
        allLoaded = true;

        setTimeout(loadingDone, 800);
    }
}

function addParticles () {
    // particles

    attributes = {

        customColor: { type: 'c', value: [] },
        time: { type: 'f', value: [] },

    };

    uniforms = {

        speed: { type: "f", value: 0.0 },
        color:     { type: "c", value: new THREE.Color( 0xffffff ) },
        texture:   { type: "t", value: 0, texture: null },
        globalTime:     { type: "f", value: 0.0 },
        type:       { type: "i", value: 0 },


    };

    var shaderMaterial = new THREE.ShaderMaterial( {

        uniforms:       uniforms,
        attributes:     attributes,
        vertexShader:   document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,

        blending:       THREE.NormalBlending,
        depthTest:      true,
        transparent:    true,
        
    });


    var geometry = new THREE.Geometry();

    for ( var i = 0; i < 3500; i++ ) {
        var vector = new THREE.Vector3(-300, Math.random()*300, Math.random()*300 - 150);

        geometry.vertices.push( new THREE.Vector3( vector ) );
    }


    var vertices = geometry.vertices;
    var values_color = attributes.customColor.value;
    var values_time = attributes.time.value;

    for( var v = 0; v < vertices.length; v++ ) {
        values_color[ v ] = new THREE.Color( 0x684d2a );
        values_time[ v ] = Math.random();
    }

    particlesFront = new THREE.ParticleSystem( geometry, shaderMaterial );
    particlesFront.rotation.y = -Math.PI/2;
    particlesFront.position.y = 5;
    particlesFront.position.z = 25;
    car.add( particlesFront );

    particlesBack = new THREE.ParticleSystem( geometry, shaderMaterial );
    particlesBack.rotation.y = -Math.PI/2;
    particlesBack.position.y = 5;
    particlesBack.position.z = -35;
    car.add( particlesBack );

}
                       
function addDust () {
    // particles
    var map = THREE.ImageUtils.loadTexture( "img/dust2.png" );

    attributes_dust = {

        customColor: { type: 'c', value: [] },
        time: { type: 'f', value: [] },

    };

    uniforms_dust = {

        speed: { type: "f", value: 0.0 },
        color:     { type: "c", value: new THREE.Color( 0xffffff ) },
        texture:   { type: "t", value: 0, texture: map },
        globalTime:     { type: "f", value: 0.0 },
        type:       { type: "i", value: 1 },

    };

    var shaderMaterial = new THREE.ShaderMaterial( {

        uniforms:       uniforms_dust,
        attributes:     attributes_dust,
        vertexShader:   document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,

        blending:       THREE.NormalBlending,
        depthTest:      false,
        transparent:    true,
        
    });


    var geometry = new THREE.Geometry();

    for ( var i = 0; i < 25; i++ ) {
        var vector = new THREE.Vector3(-300, Math.random()*300, Math.random()*300 - 150);

        geometry.vertices.push( new THREE.Vector3( vector ) );
    }


    var vertices = geometry.vertices;
    var values_color = attributes_dust.customColor.value;
    var values_time = attributes_dust.time.value;

    for( var v = 0; v < vertices.length; v++ ) {
        values_color[ v ] = new THREE.Color( 0xbc9e77 );
        values_time[ v ] = Math.random();
    }


    dustFront = new THREE.ParticleSystem( geometry, shaderMaterial );

    dustFront.sortParticles = true;
    dustFront.rotation.y = -Math.PI/2;
    dustFront.position.y = 5;
    dustFront.position.z = 25;
    car.add( dustFront );


    dustBack = new THREE.ParticleSystem( geometry, shaderMaterial );
    dustBack.sortParticles = true;
    dustBack.rotation.y = -Math.PI/2;
    dustBack.position.y = 5;
    dustBack.position.z = -35;

    car.add( dustBack );

}

function initCar() {
    // cube
    var cubeGeometry = new THREE.CubeGeometry(10,10,10);
    var cubeMaterial = new THREE.MeshLambertMaterial( {color: 0x00ff00, shading: THREE.FlatShading} );
    cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeMesh.position.y = 500;
    cubeMesh.visible = false;
    scene.add(cubeMesh);
                
    // Models
    var loader = new THREE.JSONLoader();
    
    car = new THREE.Object3D();    
    carContainer = new THREE.Object3D();
    car.add(carContainer);
    car.matrixAutoUpdate = false;
    scene.add(car);

    loader.load( "js/monster.js", function( geometry ) {

        var material = new THREE.MeshBasicMaterial({color : 0x566D71});
        carMesh = new THREE.Mesh( geometry, material );
        carMesh.scale.set(0.5,0.5,0.5);
        carMesh.position.y = 16;

        carMesh.castShadow = true;
        carMesh.receiveShadow = false;

        carContainer.add( carMesh );
        
        checkLoaded();

    } );

    loader.load( "js/wheel2.js", function( geometry ) {

        var material = new THREE.MeshBasicMaterial({color : 0x4C6367});
        frontleft = new THREE.Mesh( geometry, material );
        frontleft.rotation.y = Math.PI/2;
        frontleft.position.x = 34;
        frontleft.position.z = 32;
        frontleft.position.y = 20;

        frontleft.castShadow = true;
        frontleft.receiveShadow = false;

        frontleft.doubleSided = true;

        car.add( frontleft );

        frontright = new THREE.Mesh( geometry, material );
        frontright.rotation.y = -Math.PI/2;
        frontright.position.x = -34;
        frontright.position.z = 32;
        frontright.position.y = 20;

        frontright.castShadow = true;
        frontright.receiveShadow = false;

        frontright.doubleSided = true;

        car.add( frontright );

        backleft = new THREE.Mesh( geometry, material );
        backleft.rotation.y = -Math.PI/2;
        backleft.position.x = 34;
        backleft.position.z = -29;
        backleft.position.y = 20;

        backleft.castShadow = true;
        backleft.receiveShadow = false;

        backleft.doubleSided = true;
        
        car.add( backleft );

        backright = new THREE.Mesh( geometry, material );
        backright.rotation.y = Math.PI/2;
        backright.position.x = -34;
        backright.position.z = -29;
        backright.position.y = 20;

        backright.castShadow = true;
        backright.receiveShadow = false;

        backright.doubleSided = true;

        car.add( backright );
        
        addParticles();
        addDust();
        checkLoaded();
        
    } );
}

function initStar() {
    var loader = new THREE.JSONLoader();
    loader.load( "js/star.js", function( geometry ) {

        var material = new THREE.MeshBasicMaterial( {color: 0xffe073, shading: THREE.FlatShading} );
        
        star = new THREE.Mesh( geometry, material );
        star.doubleSided = true;
        star.scale.set(60,60,60);
        star.position.x = 5000;
    
        scene.add( star );
    
        checkLoaded();
    } );
}
function setStar() {
    star.scale.set(40,40,40);

    var rx = (Math.random()*3000)+3000;
    var rz = (Math.random()*3000)+3000;
    if (Math.random() < 0.5) rx *= -1; 
    if (Math.random() < 0.5) rz *= -1; 

    var x = carx + rx;
    var z = carz + rz;

    ray.origin.y = 10000;
    ray.origin.x = x;
    ray.origin.z = z;

    var c = THREE.Collisions.rayCastNearest(ray);

    if(c) {
        var temp = ray.origin.clone().sub( new THREE.Vector3(0, c.distance, 0) );
        star.position.x = x;
        star.position.z = z;

        star.position.y = temp.y-100;

        var tween = new TWEEN.Tween(star.position)
            .to({y: star.position.y+200}, 300)
            .easing(TWEEN.Easing.Linear.EaseNone);
        tween.start();

        star.material.opacity = 1;

    } else {
        setStar();
        //console.log("retry setStar");
    }

    starTaken = false;
}

function getStar() {
    starTaken = true;

    playStaticSound(starSound,0.4);

    ++starCount;

    var tween = new TWEEN.Tween(star.position)
        .to({y: star.position.y+250}, 300)
        .easing(TWEEN.Easing.Linear.EaseNone)
        .onComplete(setStar);
    tween.start();

    var scaleTween = new TWEEN.Tween(star.scale)
        .to({x: 70, y: 70, z: 70}, 300)
        .easing(TWEEN.Easing.Linear.EaseNone);
    scaleTween.start();

    var rotTween = new TWEEN.Tween(star.rotation)
        .to({y: star.rotation.y+12}, 300)
        .easing(TWEEN.Easing.Linear.EaseNone);
    rotTween.start();

    var alphaTween = new TWEEN.Tween(star.material)
        .to({opacity: 0.25}, 200)
        .delay(20)
        .easing(TWEEN.Easing.Linear.EaseNone);
    alphaTween.start();         

}

function initArrow() {
    var loader = new THREE.JSONLoader();
    loader.load( "js/arrow.js", function( geometry ) {

        var material = new THREE.MeshLambertMaterial( {color: 0xc83922, shading: THREE.SmoothShading} );
        arrow = new THREE.Mesh( geometry, material );
        arrow.rotation.z = -0.25;

        scene.add( arrow );

        checkLoaded();
        var tween = new TWEEN.Tween(arrow.scale)
                .to({x: 2, y: 2, z: 2}, 500)
                .delay(1500)
                .easing(TWEEN.Easing.Linear.EaseNone);
            tween.start();

    } );
}

function initSound() {
    try {
        contextAudio = new webkitAudioContext();
        loadEngineSound("engine.zip");

    }
    catch(e) {
        //console.log("No Web Audio API");
    }
}

function loadEngineSound(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // decode
    request.onload = function() {
    contextAudio.decodeAudioData(request.response, function(buffer) {
        engineBuffer = buffer;
        playSound(engineBuffer);
        }, onErrorSound);
    }
    request.send();
}

function playSound(buffer) {

    sourceNode = contextAudio.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = true;

    gainNode = contextAudio.createGainNode();
    sourceNode.connect(gainNode);
    gainNode.connect(contextAudio.destination);

    sourceNode.noteOn(0);

    sourceNode.playbackRate.value = 0.5;
    gainNode.gain.value = 0.2;

}

function toggleSound () {
    if (soundOn) {
        soundOn = false;
    } else {
        soundOn = true;
    }

    updateCounter();
}

function onErrorSound (e) {
    console.log(e);
}
            
function updateCounter () {
    if (time < lastTimeUpdate+1000) {
        return;
    }
    
    var elapsedTime = time-startTime;
    var endTime = 120*1000;
    
    var countDown = endTime - elapsedTime;
    var seconds = countDown/1000;
    var minutes = Math.floor(seconds/60);
    var outSeconds = Math.floor(seconds - (minutes*60));
    
    if (minutes < 10) minutes = "0"+minutes;
    if (outSeconds < 10) outSeconds = "0"+outSeconds;
    
    if (countDown <= 0) {
        minutes = "00";
        outSeconds = "00";
        console.log("time up");
        
        showResult();
    
        speed = 0;
        uniforms.speed.value = speed/maxspeed;
        uniforms_dust.speed.value = speed/maxspeed;
    }
    
    lastTimeUpdate = time;
    
    var numStars = starCount;
    if (numStars < 10) numStars = "0"+numStars;
    
    document.getElementById('hud').innerHTML = minutes+":"+outSeconds+"<BR><img src='img/star.png'> x "+numStars;
    if (soundOn) {
        document.getElementById('hud').innerHTML += "<BR><BR><a href='javascript:toggleSound()'><img src='img/sound_on.png'></a>";
    } else {
        document.getElementById('hud').innerHTML += "<BR><BR><a href='javascript:toggleSound()'><img src='img/sound_off.png'></a>";               
    }
}
function initGame () {
    console.log("initGame");
    hideInstruction();
    gameStarted = true;
    
    startTime = new Date().getTime();

    initSound();

    animate();

    setTimeout(setStar, 1000);

    arrow.scale.set(0.01,0.01,0.01);
    var tween = new TWEEN.Tween(arrow.scale)
        .to({x: 2, y: 2, z: 2}, 500)
        .delay(1500)
        .easing(TWEEN.Easing.Linear.EaseNone);
    tween.start();
}


function restartGame () {

    hideResult();
            
    startTime = new Date().getTime();

    setStar();

    gameOver = false;

    starCount = 0;

    updateCounter();
}

function init() {
    document.addEventListener( 'mousedown', onDocumentMousedown, false );
    showInstruction(allLoaded);
    initRenderer();
    initScene();
    initCamera();
    initGround();
    initLight();
    initSun();
    initSky();
    initCar();
    initStar();
    initArrow();    
}
function clearTexture(texture) {
    var contextTexture = texture.getContext( '2d' )

    contextTexture.fillStyle = "rgb(222, 172, 109)";
    contextTexture.fillRect(0, 0, 256, 256);
}
function updateTexture(texture, x, y, alpha) {
    var contextTexture = texture.getContext( '2d' )

    contextTexture.fillStyle = "rgba(189, 148, 95, "+alpha+")";
    contextTexture.fillRect(x-1.5,y-1.5,3,3);
}
            
function control(delta) {
    var optimalDivider = delta/16;

    var actualMaxspeed = maxspeed*optimalDivider;
    
    //计算转角
    steering = steering-(steering*0.1);//转角每次减少 1/10
    if (speed < 0) {
        speed = 0;
    }   
    // left
    if (keyLeft) {
        steering += 0.012*optimalDivider;
    }
    // right
    if (keyRight) {
        steering -= 0.012*optimalDivider;
    }
    // maxsteering
    if (steering > 2) {
        steering = 2;
    }
    if (steering < -2) {
        steering = -2;
    }
    
    //计算速度
    // accelerate
    if (keyUp && speed < actualMaxspeed) {
        speed += 0.5*optimalDivider;
    } else {
        speed = speed*0.95;
        speed = speed*(1.0-(0.05*optimalDivider));
    }
    // brake
    if (keyDown) {
        speed = speed*0.93/optimalDivider;
        if (speed < 0.1) {
            speed = -8*optimalDivider;
        }
    }
    
    // ideal change
    var ideal_hm = speed*Math.sin(angle);
    var ideal_vm = speed*Math.cos(angle);
    
    // real change
    hm += ((ideal_hm-hm)*friction);
    vm += ((ideal_vm-vm)*friction);
    
    // rotate according to speed
    var actual_speed = Math.sqrt((hm*hm)+(vm*vm))/optimalDivider;

    if (speed > 0) {
        angle += (steering*actual_speed)*.020;
    } else {                
        angle -= (steering*actual_speed)*.020;
    }
    
    // cube
    cubeMesh.position.x = carx + Math.sin(angle)*100;
    cubeMesh.position.z = carz + Math.cos(angle)*100;
    
    //旋转4个轮子
    frontleft.rotation.z -= speed/(60/optimalDivider);
    frontright.rotation.z += speed/(60/optimalDivider);
    backleft.rotation.z -= speed/(60/optimalDivider);
    backright.rotation.z += speed/(60/optimalDivider);
    
    //旋转两个前轮
    frontleft.rotation.y = -Math.PI/2 + steering*5/optimalDivider;
    frontright.rotation.y = Math.PI/2 + steering*5/optimalDivider;
    
    //调整车子倾斜
    var tilt = (steering*actual_speed)*.075;
    carContainer.rotation.z = tilt/optimalDivider;
    if (tilt > 0) {
        frontleft.position.y = 20+tilt*(30/optimalDivider);
        backleft.position.y = 20+tilt*(30/optimalDivider);
    } else {
        frontright.position.y = 20+tilt*-(30/optimalDivider);
        backright.position.y = 20+tilt*-(30/optimalDivider);                    
    }
    
    // tiles更新地面，避免小车跑出边界
    var checkx = carx + Math.sin(angle)*1200;
    var checkz = carz + Math.cos(angle)*1200;
    var wherex = Math.floor((checkx+2500)/5000);
    var wherez = Math.floor((checkz+2500)/5000);

    if (wherex > lastx) {
        // move first col to last
        for (var z=0; z<groundArray.length; ++z ) {
            var ground = groundArray[z].shift();
            ground.position.x += 15000;
            ground.material.opacity = 0.95;
            clearTexture(ground.material.map.image);
            ground.material.map.needsUpdate = true;
            var tween = new TWEEN.Tween(ground.material)
                .to({opacity: 1}, 1500)
                .easing(TWEEN.Easing.Cubic.EaseOut);
            tween.start();
            groundArray[z].push(ground);
        }
    }
    if (wherex < lastx) {
        // move last col to front
        for (var z=0; z<groundArray.length; ++z ) {
            var ground = groundArray[z].pop();
            ground.position.x -= 15000;
            ground.material.opacity = 0.95;
            clearTexture(ground.material.map.image);
            ground.material.map.needsUpdate = true;
            var tween = new TWEEN.Tween(ground.material)
                .to({opacity: 1}, 1500)
                .easing(TWEEN.Easing.Cubic.EaseOut);
            tween.start();
            groundArray[z].unshift(ground);
        }
    }
    if (wherez > lastz) {
        // move last row to front
        var lastrow = groundArray.shift();
        for (var i=0; i<lastrow.length; ++i ) {
            var ground = lastrow[i];
            ground.material.opacity = 0.95;
            clearTexture(ground.material.map.image);
            ground.material.map.needsUpdate = true;
            var tween = new TWEEN.Tween(ground.material)
                .to({opacity: 1}, 1500)
                .easing(TWEEN.Easing.Cubic.EaseOut);
            tween.start();
            ground.position.z += 15000;
        }
        groundArray.push(lastrow);
    }
    if (wherez < lastz) {
        // move last row to back
        var lastrow = groundArray.pop();
        for (var i=0; i<lastrow.length; ++i ) {
            var ground = lastrow[i];
            ground.material.opacity = 0.95;
            clearTexture(ground.material.map.image);
            ground.material.map.needsUpdate = true;
            var tween = new TWEEN.Tween(ground.material)
                .to({opacity: 1}, 1500)
                .easing(TWEEN.Easing.Cubic.EaseOut);
            tween.start();
            ground.position.z -= 15000;
        }
        groundArray.unshift(lastrow);
    }


    lastx = wherex;
    lastz = wherez;
                
    var divider = 1.1-(speed/30);
    //第一条射线，更新cubeMesh
    
    ray.origin.y = 10000;
    
    ray.origin.x = cubeMesh.position.x;
    ray.origin.z = cubeMesh.position.z;
    var c = THREE.Collisions.rayCastNearest(ray);

    if(c) {
        var temp = ray.origin.clone().sub( new THREE.Vector3(0, c.distance, 0) );
        cubeMesh.position.y += (temp.y - cubeMesh.position.y)/Math.max(3, 6*divider);

    }
    
    
    // 第二条射线
    ray.origin.x = carx+hm;
    ray.origin.z = carz+vm;
    ray.origin.y = 10000;

    var c = THREE.Collisions.rayCastNearest(ray);
    var onMesh;

    if(c) {
        var tempPos = ray.origin.clone().sub( new THREE.Vector3(0, c.distance, 0) );
        caryto = tempPos.y;
        //tempNormal = groundArray[0][0].matrixRotationWorld.multiplyVector3( c.normal.clone() );
        var normalMatrix = new THREE.Matrix3();
        normalMatrix.getNormalMatrix( groundArray[0][0].matrixWorld );
        
        var rotatedNormal = new THREE.Vector3().copy( c.normal );
        rotatedNormal.applyMatrix3( normalMatrix );
        //tempNormal = c.normal.clone().applyProjection(groundArray[0][0].matrixWorld);
        tempNormal = rotatedNormal;
        onMesh = c.mesh;
    }
    
    currentNormal.x += (tempNormal.x - currentNormal.x)/Math.max(2, 5*divider);
    currentNormal.y += (tempNormal.y - currentNormal.y)/Math.max(2, 5*divider);
    currentNormal.z += (tempNormal.z - currentNormal.z)/Math.max(2, 5*divider);
    
    var zvec = new THREE.Vector3(cubeMesh.position.x, cubeMesh.position.y, cubeMesh.position.z);
    zvec.sub( car.position ).normalize();
    
    var xvec = new THREE.Vector3();
    var yvec = new THREE.Vector3(currentNormal.x*-1, currentNormal.z*-1, currentNormal.y);

    xvec.crossVectors(zvec, yvec);
    yvec.crossVectors(zvec, xvec);
    car.matrixWorld.n11 = xvec.x; car.matrixWorld.n12 = yvec.x; car.matrixWorld.n13 = zvec.x; car.matrixWorld.n14 = carx;
    car.matrixWorld.n21 = xvec.y; car.matrixWorld.n22 = yvec.y; car.matrixWorld.n23 = zvec.y; car.matrixWorld.n24 = cary;
    car.matrixWorld.n31 = xvec.z; car.matrixWorld.n32 = yvec.z; car.matrixWorld.n33 = zvec.z; car.matrixWorld.n34 = carz;



    carx += hm;
    cary += (caryto - cary)/Math.max(2, 4*divider);
    carz += vm;

    car.position.x = carx;
    car.position.y = cary;
    car.position.z = carz;
    car.rotation.y = angle;//这里旋转小车，上面的那些不起作用，很无语哦
    
    car.updateMatrix();
    //更新车轮碾压过的痕迹
    
    if (onMesh != undefined) {
                        
        var px = Math.abs((onMesh.position.x - carx - 2500)) / 5000;
        var py = Math.abs((onMesh.position.z - carz - 2500)) / 5000;
        
        var tx = Math.ceil(px * 256);
        var ty = Math.ceil(py * 256);

        var a = uniforms.speed.value*0.5 + Math.abs(steering*4);
        
        var texture = onMesh.material.map;

        updateTexture(texture.image,tx,ty,a+0.1);
        texture.needsUpdate = true;
        
    }
    
    if (!starTaken) {
        var distX = carx-star.position.x;
        var distZ = carz-star.position.z;

        var angleArrow = Math.atan2(distX, distZ) + Math.PI/2;
        arrow.rotation.y = angleArrow;
    }
    arrow.position.set(carx,cary+300,carz);

    star.rotation.y += 0.05;//实现星星旋转
    if (carx < star.position.x+70 && carx > star.position.x-70 && !starTaken) {
        if (carz < star.position.z+70 && carz > star.position.z-70) {
            getStar();
        }
    }
    
    // camera
    camx += (carx+Math.sin(angle-Math.PI)*400 - camx)/Math.max(1, (15/optimalDivider) );
    camz += (carz+Math.cos(angle-Math.PI)*400 - camz)/Math.max(1, (15/optimalDivider) );
    camy += (cary+220 - camy)/Math.max(1, (10/optimalDivider) );

    camera.position.set(camx,camy,camz);
    camera.lookAt(car.position);
    
    
    
    sky.position.x = carx;
    sky.position.z = carz;

    sun.position.set( camx, 2300, camz+9900);
    sun.rotation = carx/3000;
    var pulse = 12+Math.abs(Math.sin(time/3000));
    sun.scale.set(pulse,pulse,pulse);
    
    
    // 改变点光源
    
    light.position.set( car.position.x, car.position.y+300, car.position.z+200 );
    light.target.position.set( car.position.x, car.position.y, car.position.z );
    light.target.updateMatrixWorld();
    // sound
    if (sourceNode) {  
        var s = Math.abs(speed/(maxspeed+2))
        sourceNode.playbackRate.value = 0.8 + s + ((Math.random()/4) * Math.max(0.1, s));
        gainNode.gain.value = 0.1 + Math.abs(speed/(maxspeed*10));
        if (!soundOn) {
            gainNode.gain.value = 0;
        }
    }
}

function render() {
    time = new Date().getTime();
    delta = time - oldTime;
    oldTime = time;


    if (isNaN(delta) || delta > 1000 || delta == 0 ) {
        delta = 1000/60;
    }
    if (!gameOver && allLoaded) {
        updateCounter();
        control(delta);
    }
    TWEEN.update();
    renderer.clear();
    renderer.render(scene, camera);
}

function animate() {
    requestAnimationFrame( animate );
    render();   
}

init();