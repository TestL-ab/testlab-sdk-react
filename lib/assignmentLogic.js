function hashMessage(message) {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return (hash + 2147483647) / 4294967294; // Scale to [0, 1]
}

function isActive(startDate, endDate) {
  let currentDate = new Date();
  return currentDate >= startDate && currentDate <= endDate;
}

function isEnabled(experiments, name, userID) {
  // Find target experiment based on name
  let experiment = experiments.filter((exp) => exp.name === name)[0];
  if (!experiment) {
    throw new TypeError("Provided name does not match any experiment.");
  }

  // Return false if current date is outside of date range for experiment
  let startDate = new Date(experiment.start_date);
  let endDate = new Date(experiment.end_date);

  if (!isActive(startDate, endDate)) {
    return false;
  }

  // Return false if experiment is not running (toggled off) or if the hashed ID is outside of the target user_percentage range

  // For Type 3 (experiments), users can only be assigned to one experiment (total percentage of users enrolled in experiments can not exceed 100%)

  if (experiment.type_id === 1) {
    return experiment.is_running ? true : false;
  } else if (experiment.type_id === 2) {
    let hashedID = hashMessage(userID + name);
    return experiment.is_running && hashedID < experiment.user_percentage
      ? true
      : false;
  } else if (experiment.type_id === 3) {
    let hashedID = hashMessage(userID);

    let type3Experiments = experiments.filter(
      (exp) =>
        exp.type_id === 3 &&
        isActive(new Date(exp.start_date), new Date(exp.end_date))
    );
    let [segmentStart, segmentEnd] = [0, 0];

    for (let i = 0; i < type3Experiments.length; i++) {
      segmentEnd += type3Experiments[i].user_percentage;
      if (
        hashedID >= segmentStart &&
        hashedID <= segmentEnd &&
        type3Experiments[i].name === name
      ) {
        return true;
      } else {
        segmentStart = segmentEnd;
      }
    }
  }

  return false;
}

function getVariant(experiments, name, userID) {
  let hashedID = hashMessage(userID);
  console.log("uuid, hashed", userID, hashedID);

  let experiment = experiments.filter((exp) => exp.name === name)[0];
  if (!experiment) {
    throw new TypeError("Provided name does not match any experiment.");
  }
  let variants = experiment.variant_arr;
  let type3Experiments = experiments.filter((exp) => exp.type_id === 3);
  let [segmentStart, segmentEnd] = [0, 0];

  for (let i = 0; i < type3Experiments.length; i++) {
    segmentEnd += type3Experiments[i].user_percentage;
    if (
      hashedID >= segmentStart &&
      hashedID <= segmentEnd &&
      type3Experiments[i].name === name
    ) {
      let runningTotal = segmentStart;
      for (let i = 0; i < variants.length; i++) {
        runningTotal += variants[i].weight * variants[i].weight;
        if (hashedID <= runningTotal) {
          return variants[i];
        }
      }
    } else {
      segmentStart = segmentEnd;
    }
  }
  return false;
}

export { isEnabled, getVariant };
