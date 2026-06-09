\# Database Schema



\## Users



| Field | Type |

|---------|---------|

| id | UUID |

| full\_name | VARCHAR |

| email | VARCHAR |

| password\_hash | VARCHAR |

| role | ENUM (farmer, veterinarian, admin) |

| phone | VARCHAR |

| created\_at | TIMESTAMP |



\---



\## Cattle



| Field | Type |

|---------|---------|

| id | UUID |

| owner\_id | UUID |

| animal\_tag | VARCHAR |

| breed | VARCHAR |

| age | INTEGER |

| gender | VARCHAR |

| created\_at | TIMESTAMP |



\---



\## Cases



| Field | Type |

|---------|---------|

| id | UUID |

| cattle\_id | UUID |

| uploaded\_by | UUID |

| image\_url | TEXT |

| prediction | VARCHAR |

| confidence\_score | FLOAT |

| severity | VARCHAR |

| status | VARCHAR |

| created\_at | TIMESTAMP |



\---



\## Reports



| Field | Type |

|---------|---------|

| id | UUID |

| case\_id | UUID |

| veterinarian\_id | UUID |

| recommendation | TEXT |

| report\_file\_url | TEXT |

| created\_at | TIMESTAMP |



\---



\## Locations



| Field | Type |

|---------|---------|

| id | UUID |

| case\_id | UUID |

| latitude | DECIMAL |

| longitude | DECIMAL |

| district | VARCHAR |

| state | VARCHAR |



\---



\## Notifications



| Field | Type |

|---------|---------|

| id | UUID |

| user\_id | UUID |

| message | TEXT |

| is\_read | BOOLEAN |

| created\_at | TIMESTAMP |

