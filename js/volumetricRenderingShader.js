class VolumetricRenderingShader extends Shader {

    static get RAYCAST_METHOD_MIP() { return 0; }
    static get RAYCAST_METHOD_FIRST_HIT() { return 1; }

    constructor() {
        super("volRender_vert", "volRender_frag");
        this.setUniform('raycasting_method', 0); // Set MIP as standard compositing method
        this.setUniform('iso_value', 0.005);
        this.setUniform('enable_first_hit_shading', 0);
    }

    setIsoValue(isoVal) {
        this.setUniform('iso_value', isoVal);
    }

    setSecondIsoValue(isoVal) {
        this.setUniform('iso_value_two', isoVal);
    }

    setIsoAlpha(isoAlpha) {
        this.setUniform('iso_alpha', isoAlpha);
    }

    setSecondIsoAlpha(isoAlpha) {
        this.setUniform('iso_alpha_two', isoAlpha);
    }

    setIsoColor(isoColor) {
        this.setUniform('iso_color', isoColor);
    }

    setSecondIsoColor(isoColor) {
        this.setUniform('iso_color_two', isoColor);
    }

    setCompositingMethod(raycast_method) {
        this.setUniform('raycasting_method', raycast_method);
    }

    enableFirstHitShading(enable) {
        this.setUniform('enable_first_hit_shading', enable ? 1 : 0);
    }

    enableSecondIsoPlain(enable) {
        this.setUniform('enable_second_iso_plain', enable ? 1 : 0);
    }

}