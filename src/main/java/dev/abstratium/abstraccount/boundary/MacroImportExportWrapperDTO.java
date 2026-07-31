package dev.abstratium.abstraccount.boundary;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

import java.util.List;

/**
 * Wrapper DTO for YAML macro import/export files.
 */
@RegisterForReflection
public record MacroImportExportWrapperDTO(
    @JsonProperty("abstraccount_export_version")
    String abstraccountExportVersion,

    @JsonProperty("artefact_type")
    String artefactType,

    List<MacroImportExportDTO> items
) {
}
