class FirstPassShader extends Shader {
    constructor(faceSide){
        super("firstPass_vert", "firstPass_frag");
        this.material.side = faceSide;
    }
}