package dev.abstratium.core.boundary;

public class FunctionalException extends RuntimeException {

    private final String errorCode;
    
    public FunctionalException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
}
