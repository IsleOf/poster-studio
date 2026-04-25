// Shared style constants for sidebar panel components.

export const inputStyles = {
    bg: "white",
    border: "1px solid",
    borderColor: "gray.300",
    _focus: { borderColor: "gray.900", boxShadow: "none", bg: "white" },
    _hover: { borderColor: "gray.400" },
    borderRadius: "md",
    fontSize: "sm",
    color: "gray.900",
};

export const labelStyles = {
    fontSize: "xs" as const,
    fontWeight: "600" as const,
    color: "gray.700",
    mb: 2,
};

export const toggleButtonStyles = (isActive: boolean) => ({
    size: "sm" as const,
    flex: 1,
    variant: "outline" as const,
    borderColor: isActive ? "gray.900" : "gray.300",
    color: isActive ? "white" : "gray.700",
    bg: isActive ? "gray.900" : "white",
    _hover: {
        bg: isActive ? "gray.800" : "gray.50",
        borderColor: isActive ? "gray.800" : "gray.400",
    },
    fontWeight: isActive ? "600" : "500",
    fontSize: "sm" as const,
});
