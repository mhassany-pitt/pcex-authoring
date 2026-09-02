// PCEX Authoring: Live Server Audit Script
(async () => {
  const targetServerSources = [
  "6a9060c4cbc5a3f2aa638aa5",
  "6a9060c4cbc5a3f2aa638aa7",
  "6a9060c4cbc5a3f2aa638aa9",
  "6a9060c4cbc5a3f2aa638aab",
  "6a9060c5cbc5a3f2aa638aad",
  "6a9060c5cbc5a3f2aa638aaf",
  "6a9060c5cbc5a3f2aa638ab1",
  "6a9060c5cbc5a3f2aa638ab3",
  "6a9060c5cbc5a3f2aa638ab5",
  "6a9060c5cbc5a3f2aa638ab7",
  "6a9060c5cbc5a3f2aa638ab9",
  "6a9060c5cbc5a3f2aa638abb",
  "6a9060c6cbc5a3f2aa638abd",
  "6a9060c6cbc5a3f2aa638abf",
  "6a9060c6cbc5a3f2aa638ac1",
  "6a9060c6cbc5a3f2aa638ac3",
  "6a9060c6cbc5a3f2aa638ac5",
  "6a9060c6cbc5a3f2aa638ac7",
  "6a9060c6cbc5a3f2aa638ac9",
  "6a9060c6cbc5a3f2aa638acb",
  "6a9060c6cbc5a3f2aa638acd",
  "6a9060c7cbc5a3f2aa638acf",
  "6a9060c7cbc5a3f2aa638ad1",
  "6a9060c7cbc5a3f2aa638ad3",
  "6a9060c7cbc5a3f2aa638ad5",
  "6a9060c7cbc5a3f2aa638ad7",
  "6a9060c7cbc5a3f2aa638ad9",
  "6a9060c7cbc5a3f2aa638adb",
  "6a9060c7cbc5a3f2aa638add",
  "6a9060c8cbc5a3f2aa638adf",
  "6a91ae6232e78ede45c11671",
  "6a91ae6232e78ede45c11673",
  "6a91ae6332e78ede45c11675",
  "6a91ae6332e78ede45c11677",
  "6a91ae6332e78ede45c11679",
  "6a91ae6332e78ede45c1167b",
  "6a91ae6332e78ede45c1167d",
  "6a91ae6332e78ede45c1167f",
  "6a91ae6332e78ede45c11681",
  "6a91ae6332e78ede45c11683",
  "6a91ae6432e78ede45c11685",
  "6a91ae6432e78ede45c11687",
  "6a91ae6432e78ede45c11689",
  "6a91ae6432e78ede45c1168b",
  "6a91ae6432e78ede45c1168d",
  "6a91ae6432e78ede45c1168f",
  "6a91ae6432e78ede45c11691",
  "6a91ae6432e78ede45c11693",
  "6a91ae6432e78ede45c11695",
  "6a91ae6532e78ede45c11697",
  "6a91ae6532e78ede45c11699",
  "6a91ae6532e78ede45c1169b",
  "6a91ae6532e78ede45c1169d",
  "6a91ae6532e78ede45c1169f",
  "6a91ae6532e78ede45c116a1",
  "6a91ae6532e78ede45c116a3",
  "6a91ae6632e78ede45c116a5",
  "6a91ae6632e78ede45c116a7",
  "6a91ae6632e78ede45c116a9",
  "6a91ae6632e78ede45c116ab",
  "6a91ae6632e78ede45c116ad",
  "6a91ae6632e78ede45c116af",
  "6a91ae6632e78ede45c116b1",
  "6a91ae6632e78ede45c116b3",
  "6a91ae6732e78ede45c116b5",
  "6a91ae6732e78ede45c116b7",
  "6a91ae6732e78ede45c116b9",
  "6a91ae6732e78ede45c116bb",
  "6a91ae6732e78ede45c116bd",
  "6a91ae6732e78ede45c116bf",
  "6a91ae6732e78ede45c116c1",
  "6a91ae6732e78ede45c116c3",
  "6a91ae6832e78ede45c116c5",
  "6a91ae6832e78ede45c116c7",
  "6a91ae6832e78ede45c116c9",
  "6a91ae6832e78ede45c116cb",
  "6a91ae6832e78ede45c116cd",
  "6a91ae6832e78ede45c116cf",
  "6a91ae6832e78ede45c116d1",
  "6a91ae6932e78ede45c116d3",
  "6a91ae6932e78ede45c116d5",
  "6a91ae6932e78ede45c116d7",
  "6a91ae6932e78ede45c116d9",
  "6a91ae6932e78ede45c116db",
  "6a91ae6932e78ede45c116dd",
  "6a91ae6932e78ede45c116df",
  "6a91ae6a32e78ede45c116e1",
  "6a91ae6a32e78ede45c116e3",
  "6a91ae6a32e78ede45c116e5",
  "6a91ae6a32e78ede45c116e7",
  "6a91ae6a32e78ede45c116e9",
  "6a91ae6a32e78ede45c116eb",
  "6a91ae6a32e78ede45c116ed",
  "6a91ae6a32e78ede45c116ef",
  "6a91ae6b32e78ede45c116f1",
  "6a91ae6b32e78ede45c116f3",
  "6a91ae6b32e78ede45c116f5",
  "6a91ae6b32e78ede45c116f7",
  "6a91ae6b32e78ede45c116f9",
  "6a91ae6b32e78ede45c116fb",
  "6a91ae6b32e78ede45c116fd",
  "6a91ae6c32e78ede45c116ff",
  "6a91ae6c32e78ede45c11701",
  "6a91ae6c32e78ede45c11703",
  "6a91ae6c32e78ede45c11705",
  "6a91ae6c32e78ede45c11707",
  "6a91ae6c32e78ede45c11709",
  "6a91ae6c32e78ede45c1170b",
  "6a91ae6c32e78ede45c1170d",
  "6a91ae6c32e78ede45c1170f",
  "6a91ae6d32e78ede45c11711",
  "6a91ae6d32e78ede45c11713",
  "6a91ae6d32e78ede45c11715",
  "6a91ae6d32e78ede45c11717",
  "6a91ae6d32e78ede45c11719",
  "6a91ae6d32e78ede45c1171b",
  "6a91ae6d32e78ede45c1171d",
  "6a91ae6d32e78ede45c1171f",
  "6a91ae6e32e78ede45c11721",
  "6a91ae6e32e78ede45c11723",
  "6a91ae6e32e78ede45c11725",
  "6a91ae6e32e78ede45c11727",
  "6a91ae6e32e78ede45c11729"
];
  const expectedBundles = {
  "6a9060d5cbc5a3f2aa638b9b": {
    "old_id": "664e23fd91363872f0ba32ea",
    "name": "py_pythagorean_theorem",
    "expected_sources": [
      "6a9060c4cbc5a3f2aa638aa5",
      "6a9060c4cbc5a3f2aa638aa7"
    ]
  },
  "6a9060d5cbc5a3f2aa638b9d": {
    "old_id": "664e241291363872f0ba32f4",
    "name": "py_time_conversion",
    "expected_sources": [
      "6a9060c4cbc5a3f2aa638aa9",
      "6a9060c4cbc5a3f2aa638aab"
    ]
  },
  "6a9060d5cbc5a3f2aa638b9f": {
    "old_id": "664e24ba91363872f0ba331f",
    "name": "py_soda_survey",
    "expected_sources": [
      "6a9060c5cbc5a3f2aa638aad",
      "6a9060c5cbc5a3f2aa638aaf",
      "6a9060c5cbc5a3f2aa638ab1"
    ]
  },
  "6a9060d5cbc5a3f2aa638ba1": {
    "old_id": "664e24f091363872f0ba3330",
    "name": "py_vending_machine",
    "expected_sources": [
      "6a9060c5cbc5a3f2aa638ab3",
      "6a9060c5cbc5a3f2aa638ab5"
    ]
  },
  "6a9060d5cbc5a3f2aa638ba3": {
    "old_id": "664e258091363872f0ba3362",
    "name": "py_list2d_basic",
    "expected_sources": [
      "6a9060c5cbc5a3f2aa638ab7",
      "6a9060c5cbc5a3f2aa638ab9",
      "6a9060c5cbc5a3f2aa638abb"
    ]
  },
  "6a9060d5cbc5a3f2aa638ba5": {
    "old_id": "664e25cd91363872f0ba337a",
    "name": "py_search_list",
    "expected_sources": [
      "6a9060c6cbc5a3f2aa638abd",
      "6a9060c6cbc5a3f2aa638abf",
      "6a9060c6cbc5a3f2aa638ac1"
    ]
  },
  "6a9060d6cbc5a3f2aa638ba7": {
    "old_id": "664e25d691363872f0ba3383",
    "name": "py_concat_char_two_str",
    "expected_sources": [
      "6a9060c6cbc5a3f2aa638ac3",
      "6a9060c6cbc5a3f2aa638ac5"
    ]
  },
  "6a9060d6cbc5a3f2aa638ba9": {
    "old_id": "664e270491363872f0ba33b4",
    "name": "py_digits",
    "expected_sources": [
      "6a9060c6cbc5a3f2aa638ac7",
      "6a9060c6cbc5a3f2aa638ac9",
      "6a9060c6cbc5a3f2aa638acb"
    ]
  },
  "6a9060d6cbc5a3f2aa638bab": {
    "old_id": "664e274891363872f0ba33c5",
    "name": "py_check_age",
    "expected_sources": [
      "6a9060c6cbc5a3f2aa638acd",
      "6a9060c7cbc5a3f2aa638acf"
    ]
  },
  "6a9060d6cbc5a3f2aa638bad": {
    "old_id": "664e2ab591363872f0ba341e",
    "name": "py_check_product_code",
    "expected_sources": [
      "6a9060c7cbc5a3f2aa638ad1",
      "6a9060c7cbc5a3f2aa638ad3"
    ]
  },
  "6a9060d6cbc5a3f2aa638baf": {
    "old_id": "664e2c5691363872f0ba3446",
    "name": "py_repeated_sequence",
    "expected_sources": [
      "6a9060c7cbc5a3f2aa638ad5",
      "6a9060c7cbc5a3f2aa638ad7"
    ]
  },
  "6a9060d6cbc5a3f2aa638bb1": {
    "old_id": "664e2c6d91363872f0ba344e",
    "name": "py_list_process_elements",
    "expected_sources": [
      "6a9060c7cbc5a3f2aa638ad9",
      "6a9060c7cbc5a3f2aa638adb"
    ]
  },
  "6a9060d6cbc5a3f2aa638bb3": {
    "old_id": "664e2c8b91363872f0ba3468",
    "name": "py_star_patterns",
    "expected_sources": [
      "6a9060c7cbc5a3f2aa638add",
      "6a9060c8cbc5a3f2aa638adf"
    ]
  },
  "6a91ae6e32e78ede45c1172b": {
    "old_id": "664e2d5b91363872f0ba347d",
    "name": "objects_classes_point",
    "expected_sources": [
      "6a91ae6232e78ede45c11671",
      "6a91ae6232e78ede45c11673"
    ]
  },
  "6a91ae6e32e78ede45c1172d": {
    "old_id": "664e2d6191363872f0ba3487",
    "name": "py_list_basic",
    "expected_sources": [
      "6a91ae6332e78ede45c11675",
      "6a91ae6332e78ede45c11677",
      "6a91ae6332e78ede45c11679"
    ]
  },
  "6a91ae6e32e78ede45c1172f": {
    "old_id": "664e2d7391363872f0ba3499",
    "name": "py_list_rotate",
    "expected_sources": [
      "6a91ae6332e78ede45c1167b",
      "6a91ae6332e78ede45c1167d",
      "6a91ae6332e78ede45c1167f",
      "6a91ae6332e78ede45c11681"
    ]
  },
  "6a91ae6e32e78ede45c11731": {
    "old_id": "664e2e4391363872f0ba34d6",
    "name": "py_str_repeat_chars",
    "expected_sources": [
      "6a91ae6332e78ede45c11683",
      "6a91ae6432e78ede45c11685"
    ]
  },
  "6a91ae6f32e78ede45c11733": {
    "old_id": "664e2e4891363872f0ba34de",
    "name": "py_if_else_num",
    "expected_sources": [
      "6a91ae6432e78ede45c11687",
      "6a91ae6432e78ede45c11689"
    ]
  },
  "6a91ae6f32e78ede45c11735": {
    "old_id": "664e2e4d91363872f0ba34e6",
    "name": "py_if_else_grade",
    "expected_sources": [
      "6a91ae6432e78ede45c1168b",
      "6a91ae6432e78ede45c1168d"
    ]
  },
  "6a91ae6f32e78ede45c11737": {
    "old_id": "664e2eee91363872f0ba34f6",
    "name": "py_range_three",
    "expected_sources": [
      "6a91ae6432e78ede45c1168f",
      "6a91ae6432e78ede45c11691"
    ]
  },
  "6a91ae6f32e78ede45c11739": {
    "old_id": "664e2fa591363872f0ba351c",
    "name": "py_range_two",
    "expected_sources": [
      "6a91ae6432e78ede45c11693",
      "6a91ae6432e78ede45c11695"
    ]
  },
  "6a91ae6f32e78ede45c1173b": {
    "old_id": "664e2fea91363872f0ba3538",
    "name": "py_three_booleans",
    "expected_sources": [
      "6a91ae6532e78ede45c11697",
      "6a91ae6532e78ede45c11699",
      "6a91ae6532e78ede45c1169b"
    ]
  },
  "6a91ae6f32e78ede45c1173d": {
    "old_id": "664e3c3291363872f0ba354f",
    "name": "objects_classes_account",
    "expected_sources": [
      "6a91ae6532e78ede45c1169d",
      "6a91ae6532e78ede45c1169f"
    ]
  },
  "6a91ae6f32e78ede45c1173f": {
    "old_id": "664e3c8b91363872f0ba356e",
    "name": "py_file_input_stat",
    "expected_sources": [
      "6a91ae6532e78ede45c116a1",
      "6a91ae6532e78ede45c116a3"
    ]
  },
  "6a91ae6f32e78ede45c11741": {
    "old_id": "664e3ca591363872f0ba358b",
    "name": "py_win_percentage",
    "expected_sources": [
      "6a91ae6632e78ede45c116a5",
      "6a91ae6632e78ede45c116a7",
      "6a91ae6632e78ede45c116a9"
    ]
  },
  "6a91ae6f32e78ede45c11743": {
    "old_id": "664e3cae91363872f0ba3596",
    "name": "py_find_average",
    "expected_sources": [
      "6a91ae6632e78ede45c116ab",
      "6a91ae6632e78ede45c116ad",
      "6a91ae6632e78ede45c116af"
    ]
  },
  "6a91ae6f32e78ede45c11745": {
    "old_id": "664e3d3491363872f0ba35af",
    "name": "py_work_hours",
    "expected_sources": [
      "6a91ae6632e78ede45c116b1",
      "6a91ae6632e78ede45c116b3"
    ]
  },
  "6a91ae6f32e78ede45c11747": {
    "old_id": "664e40df91363872f0ba360a",
    "name": "py_concat_str_num",
    "expected_sources": [
      "6a91ae6732e78ede45c116b5",
      "6a91ae6732e78ede45c116b7",
      "6a91ae6732e78ede45c116b9"
    ]
  },
  "6a91ae7032e78ede45c11749": {
    "old_id": "664e421991363872f0ba3686",
    "name": "py_student_score",
    "expected_sources": [
      "6a91ae6732e78ede45c116bb",
      "6a91ae6732e78ede45c116bd"
    ]
  },
  "6a91ae7032e78ede45c1174b": {
    "old_id": "664e423291363872f0ba36a0",
    "name": "py_rent_car",
    "expected_sources": [
      "6a91ae6732e78ede45c116bf",
      "6a91ae6732e78ede45c116c1",
      "6a91ae6732e78ede45c116c3"
    ]
  },
  "6a91ae7032e78ede45c1174d": {
    "old_id": "664e423991363872f0ba36a9",
    "name": "py_str_count",
    "expected_sources": [
      "6a91ae6832e78ede45c116c5",
      "6a91ae6832e78ede45c116c7"
    ]
  },
  "6a91ae7032e78ede45c1174f": {
    "old_id": "664e424a91363872f0ba36b1",
    "name": "objects_classes_tv",
    "expected_sources": [
      "6a91ae6832e78ede45c116c9",
      "6a91ae6832e78ede45c116cb"
    ]
  },
  "6a91ae7032e78ede45c11751": {
    "old_id": "664e427491363872f0ba36cc",
    "name": "py_range_one",
    "expected_sources": [
      "6a91ae6832e78ede45c116cd",
      "6a91ae6832e78ede45c116cf"
    ]
  },
  "6a91ae7032e78ede45c11753": {
    "old_id": "664e427a91363872f0ba36d4",
    "name": "py_nested_if_min_max",
    "expected_sources": [
      "6a91ae6832e78ede45c116d1",
      "6a91ae6932e78ede45c116d3"
    ]
  },
  "6a91ae7032e78ede45c11755": {
    "old_id": "664e42a291363872f0ba36e4",
    "name": "py_divisor",
    "expected_sources": [
      "6a91ae6932e78ede45c116d5",
      "6a91ae6932e78ede45c116d7"
    ]
  },
  "6a91ae7032e78ede45c11757": {
    "old_id": "664e42de91363872f0ba36f1",
    "name": "py_print_medals",
    "expected_sources": [
      "6a91ae6932e78ede45c116d9",
      "6a91ae6932e78ede45c116db"
    ]
  },
  "6a91ae7032e78ede45c11759": {
    "old_id": "664e43ea91363872f0ba371f",
    "name": "py_input",
    "expected_sources": [
      "6a91ae6932e78ede45c116dd",
      "6a91ae6932e78ede45c116df",
      "6a91ae6a32e78ede45c116e1",
      "6a91ae6a32e78ede45c116e3"
    ]
  },
  "6a91ae7032e78ede45c1175b": {
    "old_id": "664e447591363872f0ba3736",
    "name": "py_nested_if_temperature",
    "expected_sources": [
      "6a91ae6a32e78ede45c116e5",
      "6a91ae6a32e78ede45c116e7"
    ]
  },
  "6a91ae7032e78ede45c1175d": {
    "old_id": "664e448991363872f0ba3749",
    "name": "py_bmi_calculator",
    "expected_sources": [
      "6a91ae6a32e78ede45c116e9",
      "6a91ae6a32e78ede45c116eb"
    ]
  },
  "6a91ae7132e78ede45c1175f": {
    "old_id": "664e44c691363872f0ba3759",
    "name": "py_list_fill",
    "expected_sources": [
      "6a91ae6a32e78ede45c116ed",
      "6a91ae6a32e78ede45c116ef"
    ]
  },
  "6a91ae7132e78ede45c11761": {
    "old_id": "664e44d391363872f0ba3768",
    "name": "py_check_adjacent",
    "expected_sources": [
      "6a91ae6b32e78ede45c116f1",
      "6a91ae6b32e78ede45c116f3",
      "6a91ae6b32e78ede45c116f5"
    ]
  },
  "6a91ae7132e78ede45c11763": {
    "old_id": "664e44db91363872f0ba3773",
    "name": "py_fail_course",
    "expected_sources": [
      "6a91ae6b32e78ede45c116f7",
      "6a91ae6b32e78ede45c116f9",
      "6a91ae6b32e78ede45c116fb"
    ]
  },
  "6a91ae7132e78ede45c11765": {
    "old_id": "664e4c0191363872f0ba37e3",
    "name": "objects_classes_loan",
    "expected_sources": [
      "6a91ae6b32e78ede45c116fd",
      "6a91ae6c32e78ede45c116ff"
    ]
  },
  "6a91ae7132e78ede45c11767": {
    "old_id": "664e4c2591363872f0ba37f9",
    "name": "py_hot_dry",
    "expected_sources": [
      "6a91ae6c32e78ede45c11701",
      "6a91ae6c32e78ede45c11703",
      "6a91ae6c32e78ede45c11705",
      "6a91ae6c32e78ede45c11707"
    ]
  },
  "6a91ae7132e78ede45c11769": {
    "old_id": "664e4c2d91363872f0ba3805",
    "name": "py_squares",
    "expected_sources": [
      "6a91ae6c32e78ede45c11709",
      "6a91ae6c32e78ede45c1170b",
      "6a91ae6c32e78ede45c1170d"
    ]
  },
  "6a91ae7132e78ede45c1176b": {
    "old_id": "664e4c5791363872f0ba380e",
    "name": "py_temperature",
    "expected_sources": [
      "6a91ae6c32e78ede45c1170f",
      "6a91ae6d32e78ede45c11711"
    ]
  },
  "6a91ae7132e78ede45c1176d": {
    "old_id": "664e4dc691363872f0ba3851",
    "name": "py_list_change",
    "expected_sources": [
      "6a91ae6d32e78ede45c11713",
      "6a91ae6d32e78ede45c11715"
    ]
  },
  "6a91ae7132e78ede45c1176f": {
    "old_id": "664e4e3e91363872f0ba3885",
    "name": "py_phone_age",
    "expected_sources": [
      "6a91ae6d32e78ede45c11717",
      "6a91ae6d32e78ede45c11719"
    ]
  },
  "6a91ae7132e78ede45c11771": {
    "old_id": "664e500891363872f0ba38c8",
    "name": "py_char_dict",
    "expected_sources": [
      "6a91ae6d32e78ede45c1171b",
      "6a91ae6d32e78ede45c1171d"
    ]
  },
  "6a91ae7132e78ede45c11773": {
    "old_id": "664e502391363872f0ba38dd",
    "name": "py_f_to_c_conversion",
    "expected_sources": [
      "6a91ae6d32e78ede45c1171f",
      "6a91ae6e32e78ede45c11721"
    ]
  },
  "6a91ae7232e78ede45c11775": {
    "old_id": "664e504991363872f0ba38f0",
    "name": "py_list_min_max",
    "expected_sources": [
      "6a91ae6e32e78ede45c11723",
      "6a91ae6e32e78ede45c11725"
    ]
  },
  "6a91ae7232e78ede45c11777": {
    "old_id": "664e50d091363872f0ba390d",
    "name": "py_if_else_wage",
    "expected_sources": [
      "6a91ae6e32e78ede45c11727",
      "6a91ae6e32e78ede45c11729"
    ]
  }
};

  console.log('================================================================');
  console.log('🔍 STARTING LIVE SERVER AUDIT FOR PCEX SOURCES & BUNDLES');
  console.log('================================================================');

  let sourcePass = 0, sourceFail = 0;
  const sourceIssues = [];

  console.log(`\n--- [1/2] Auditing ${targetServerSources.length} Sources on Server ---`);
  for (let i = 0; i < targetServerSources.length; i++) {
    const sid = targetServerSources[i];
    try {
      const res = await fetch(`/pcex-authoring/api/sources/${sid}?allUsers=true`);
      if (!res.ok) {
        sourceFail++;
        sourceIssues.push({ id: sid, issue: `HTTP ${res.status} not found` });
        console.warn(`  [${i + 1}/${targetServerSources.length}] ✗ Missing Source: ${sid} (${res.status})`);
        continue;
      }
      const src = await res.json();
      const distractors = src.distractors || [];
      const lines = src.lines || {};
      const blanks = Object.values(lines).filter(l => l && l.blank);

      const isDistractorOk = distractors.length === 3;
      const isBlanksOk = blanks.length <= 3 && blanks.length >= 1;

      if (!isDistractorOk || !isBlanksOk) {
        sourceFail++;
        sourceIssues.push({
          id: sid,
          name: src.name,
          distractors: distractors.length,
          blanks: blanks.length,
          issue: `Distractors: ${distractors.length} (expected 3), Blanks: ${blanks.length} (expected <=3)`
        });
        console.warn(`  [${i + 1}/${targetServerSources.length}] ⚠️ Anomaly in "${src.name}": ${distractors.length} distractors, ${blanks.length} blanks`);
      } else {
        sourcePass++;
      }
    } catch (err) {
      sourceFail++;
      sourceIssues.push({ id: sid, issue: err.message });
      console.error(`  [${i + 1}/${targetServerSources.length}] ✗ Error:`, err);
    }
    await new Promise(r => setTimeout(r, 40));
  }

  console.log(`\n✓ Sources Audit Complete: ${sourcePass}/${targetServerSources.length} PASSED (${sourceFail} issues)`);

  let bundlePass = 0, bundleFail = 0;
  const bundleIssues = [];
  const bundleIds = Object.keys(expectedBundles);

  console.log(`\n--- [2/2] Auditing ${bundleIds.length} Bundles on Server ---`);
  for (let i = 0; i < bundleIds.length; i++) {
    const bid = bundleIds[i];
    const exp = expectedBundles[bid];
    try {
      const res = await fetch(`/pcex-authoring/api/bundles/${bid}?allUsers=true`);
      if (!res.ok) {
        bundleFail++;
        bundleIssues.push({ id: bid, name: exp.name, issue: `HTTP ${res.status} not found` });
        console.warn(`  [${i + 1}/${bundleIds.length}] ✗ Missing Bundle: ${bid} (${res.status})`);
        continue;
      }
      const bundle = await res.json();
      const actualSources = (bundle.items || []).map(itm => itm.item);
      const expectedSources = exp.expected_sources || [];

      const isItemsCountOk = actualSources.length === expectedSources.length;
      const areSourcesMatching = isItemsCountOk && actualSources.every((sid, idx) => sid === expectedSources[idx]);
      const hasLinkings = !!bundle.linkings;
      const hasStat = !!bundle.stat;

      if (!areSourcesMatching) {
        bundleFail++;
        bundleIssues.push({
          id: bid,
          name: bundle.name || exp.name,
          expectedSources,
          actualSources,
          issue: `Source IDs mismatch (Actual: ${actualSources.join(', ')} vs Expected: ${expectedSources.join(', ')})`
        });
        console.warn(`  [${i + 1}/${bundleIds.length}] ⚠️ Source Mismatch in Bundle "${bundle.name}": Expected [${expectedSources}], got [${actualSources}]`);
      } else {
        bundlePass++;
      }
    } catch (err) {
      bundleFail++;
      bundleIssues.push({ id: bid, name: exp.name, issue: err.message });
      console.error(`  [${i + 1}/${bundleIds.length}] ✗ Error:`, err);
    }
    await new Promise(r => setTimeout(r, 40));
  }

  console.log(`\n✓ Bundles Audit Complete: ${bundlePass}/${bundleIds.length} PASSED (${bundleFail} issues)`);

  console.log('\n================================================================');
  console.log('📊 FINAL LIVE SERVER AUDIT REPORT');
  console.log('================================================================');
  console.log(`Sources on Server: ${sourcePass}/${targetServerSources.length} Valid (3 distractors, <=3 blanks)`);
  console.log(`Bundles on Server: ${bundlePass}/${bundleIds.length} Properly Bundled & Matching Sources`);
  if (sourceIssues.length === 0 && bundleIssues.length === 0) {
    console.log('🎉 PERFECT! 100% OF SOURCES AND BUNDLES ARE VERIFIED ON THE SERVER!');
  } else {
    if (sourceIssues.length > 0) {
      console.log('\n⚠️ SOURCE ISSUES FOUND:');
      console.table(sourceIssues);
    }
    if (bundleIssues.length > 0) {
      console.log('\n⚠️ BUNDLE ISSUES FOUND:');
      console.table(bundleIssues);
    }
  }
  console.log('================================================================');
})();
