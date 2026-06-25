import React, { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import CusInput from "../input";
import { X, Plus } from "lucide-react";

const CustomSProperties = ({ control, errors }: any) => {
  const [properties, setProperties] = useState<
    { label: string; values: string[] }[]
  >([]);

  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");

  return (
    <div>
      <div className="flex flex-col gap-3">
        <Controller
          name={"customProperties"}
          control={control}
          render={({ field }) => {
            useEffect(() => {
              field.onChange(properties);
            }, [properties]);

            const addProperty = () => {
              if (!newLabel.trim()) return;
              setProperties([...properties, { label: newLabel, values: [] }]);
              setNewLabel("");
            };

            const addValue = (index: number) => {
              if (!newValue.trim()) return;
              const updatedProperties = [...properties];
              updatedProperties[index].values.push(newValue);
              setProperties(updatedProperties);
              setNewValue("");
            };

            const removeProperty = (index: number) => {
              setProperties(properties.filter((_, i) => i !== index));
            };

            const removeValue = (propertyIndex: number, valueIndex: number) => {
              const updatedProperties = [...properties];
              updatedProperties[propertyIndex].values = updatedProperties[
                propertyIndex
              ].values.filter((_, i) => i !== valueIndex);

              setProperties(updatedProperties);
            };

            return (
              <div className="mt-2">
                <label
                  htmlFor=""
                  className="block font-semibold text-gray-300 mb-1"
                >
                  Custom Properties
                </label>
                <div className="flex flex-col gap-3">
                  {/* Existing properties */}
                  {properties.map((properties, index) => (
                    <div
                      key={index}
                      className="border border-gray-700 p-3 rounded-lg bg-gray-900"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">
                          {properties.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeProperty(index)}
                        >
                          <X size={18} className="text-red-500" />
                        </button>
                      </div>
                      {/* Add value to properties */}
                      <div className="flex items-center mt-2 gap-2">
                        <input
                          type="text"
                          className="border outline-none border-gray-700 bg-gray-800 p-2 rounded-md text-white w-full"
                          placeholder="Enter the value..."
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => addValue(index)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-md"
                        >
                          Add
                        </button>
                      </div>
                      {/* Show Values */}

                      <div className="flex flex-wrap gap-2 mt-2">
                        {properties.values.map((value, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-white rounded-md text-sm"
                          >
                            <span>{value}</span>
                            <button
                              type="button"
                              onClick={() => removeValue(index, i)}
                              className="text-red-400 hover:text-red-600 pl-2"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Add new property */}

                  <div className="flex items-center gap-2 mt-1">
                    <CusInput
                      placeholder="Enter property label (e.g., Material, Warranty)"
                      value={newLabel}
                      onChange={(e: any) => setNewLabel(e.target.value)}
                    />
                    <button
                      type="button"
                      className="px-3 py-2 bg-blue-500 text-white rounded-md flex items-center"
                      onClick={addProperty}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
                {errors.customProperties && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.customProperties.message as string}
                  </p>
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

export default CustomSProperties;
