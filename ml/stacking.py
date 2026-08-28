"""Prediction wrapper for the persisted P90 quantile stack."""


class P90StackingModel:
    def __init__(self, lightgbm_model, xgboost_model, meta_model, lower_model=None):
        self.lightgbm_model = lightgbm_model
        self.xgboost_model = xgboost_model
        self.meta_model = meta_model
        self.lower_model = lower_model

    def predict(self, X):
        lightgbm_predictions = self.lightgbm_model.predict(X)
        xgboost_predictions = self.xgboost_model.predict(X)
        predictions = self.meta_model.predict(list(zip(lightgbm_predictions, xgboost_predictions)))
        if self.lower_model is not None:
            predictions = __import__("numpy").maximum(predictions, self.lower_model.predict(X))
        return predictions