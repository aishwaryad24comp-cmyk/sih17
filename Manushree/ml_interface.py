from model_service import (
    predict,
    reload_model,
    get_model_info,
)

from retrain_model import retrain_model


# ==================================================
# PUBLIC PREDICTION INTERFACE
# ==================================================

def predict_project(project_data):
    """
    Official prediction function for other team members.

    Input:
        project_data -> dictionary containing project fields

    Output:
        delay prediction, probability, risk percentage,
        and risk level
    """

    return predict(project_data)


# ==================================================
# PUBLIC RETRAINING INTERFACE
# ==================================================

def retrain_prediction_model(dataset_path=None):
    """
    Retrain the official CatBoost classifier.

    After retraining completes, immediately reload the
    newest canonical model so future predictions use it.
    """

    if dataset_path:

        result = retrain_model(
            dataset_path
        )

    else:

        result = retrain_model()

    # Important:
    # retrain_model replaces the canonical
    # land_delay_classifier.pkl file.
    #
    # model_service normally caches the old model,
    # so force reload immediately.
    reload_model()

    result["model_reloaded"] = True

    return result


# ==================================================
# MODEL INFORMATION
# ==================================================

def get_prediction_model_info():
    """
    Return details about the currently loaded
    prediction model.
    """

    return get_model_info()