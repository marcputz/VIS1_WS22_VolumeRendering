class FirstPassShader extends Shader {
    constructor(color){
        super("firstPass_vert", "firstPass_frag");
        // sends color as RGB or BGR in a Vector3 array
        this.setUniform("color",
            [
                new THREE.Vector3(color[0], color[1], color[2]),
                new THREE.Vector3(color[2], color[1], color[0])
            ],
            "v3v");
        // sends whether to use RGB or BGR as index (0: RGB, 1: BGR)
        this.setUniform("colorIdx", 0);
    }
}