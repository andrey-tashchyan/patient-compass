from enum import Enum


class Gender(Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class AllergyStatus(Enum):
    CONFIRMED = "confirmed"
    SUSPECTED = "suspected"
    DENIED = "denied"
