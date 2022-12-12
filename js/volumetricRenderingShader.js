class VolumetricRenderingShader extends Shader {

    static get RAYCAST_METHOD_MIP() { return 0; }
    static get RAYCAST_METHOD_FIRST_HIT() { return 1; }

    constructor(raycast_method) {
        super("volRender_vert", "volRender_frag");
        this.setUniform('raycasting_method', raycast_method);
    }

    setIsoValue(isoVal) {
        this.setUniform('iso_value', isoVal);
    }
}