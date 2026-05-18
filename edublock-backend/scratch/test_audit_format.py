def test_format(details):
    if details:
        details_lower = details.lower()
        if "from '" in details_lower and "' to '" in details_lower:
            try:
                parts = details.split("'")
                old_s = parts[1].title()
                new_s = parts[3].title()
                display_action = f"Status Changed: {old_s} -> {new_s}"
                action_type = "warning" if new_s == "Pending" else "success" if new_s == "Issued" else "info"
                return display_action, action_type
            except Exception as e:
                return "Error", str(e)
    return "No match", None

print(test_format("Status changed from 'issued' to 'pending'"))
print(test_format("Status changed from 'pending' to 'issued'"))
print(test_format("Status changed from 'revoked' to 'pending'"))
