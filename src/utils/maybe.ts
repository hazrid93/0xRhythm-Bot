import EventEmitter = require('events');

/**
 * This class is used as a wrapper for chain of operations where any error are unimportant.
 * Error will just be swallowed and the last result pre-exception will be return. This is
 * beneficial to avoid codes that has multiple null/undefined checks.
 * 
 * @author Hazrid Azad - (0xSaiya)
 */
class Maybe<T> extends EventEmitter{
    private input: T;
    private readonly ERROR_EVENT: string = `error`;

    /**
     * @constructor constructor for Maybe
     * @param {T} input of any type
     */
    constructor(_input: T){
        super();
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
        return new Maybe<T>(_input);
    }

    public bind(_ :(input: T)=> T) {
        try{
            const result = _(this.input);
            if( result == null ) {
                return this;
            } else {
                return new Maybe<T>(result);
            }
        } catch (ex) {
            console.error(`Fail to process one of the binded method, reason: ${ex.message}`);
            this.emit(this.ERROR_EVENT, `Fail to process one of the binded method, reason: ${ex.message}`);
            return this;
        }
    }
}

export default Maybe;