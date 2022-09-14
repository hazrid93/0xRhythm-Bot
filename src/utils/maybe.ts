class MaybeItem<T> {
    private input: T;

    /**
     * @constructor constructor for MaybeItem
     * @param {T} input of any type
     */
    private constructor(_input: T){
        this.input = _input;
    }

    /**
     * The method to pass the initial value and wrapped as MaybeItem monad.
     * @static
     * @function
     * @template T
     * @param {T} input of any type
     * @returns {Maybe<T>} returns the response of binded function that processed the input wrapped as MaybeItem
     */ 
    public static start<T>(_input: T){
        return new MaybeItem<T>(_input);
    }
    
    public bind(_ :(input: T)=> T) {
        try{
            const result = _(this.input);
            if( result == null ) {
                return this;
            } else {
                return new MaybeItem<T>(result);
            }
        } catch (ex) {
            return this;
        }
    }
}

export default MaybeItem;